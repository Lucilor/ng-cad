import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	LineBasicMaterial,
	Vector3,
	Line,
	Object3D,
	Vector2,
	ArcCurve,
	MathUtils,
	Raycaster,
	Geometry,
	EllipseCurve,
	Color,
	ShapeGeometry,
	Shape,
	Mesh,
	MeshBasicMaterial,
	Group
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import {CadViewerControls, CadViewerControlsConfig} from "./cad-viewer-controls";
import {CadData, CadEntity, CadLine, CadTypes, CadArc, CadCircle, CadEntities, CadMtext, CadDimension} from "./cad-data";
import TextSprite from "@seregpie/three.text-sprite";

export const CAMERA_Z = 800;

export class CadStyle {
	color?: number;
	lineWidth?: number;
	fontSize?: number;
	constructor(params: {color?: number; lineWidth?: number; fontSize?: number} = {}, cad?: CadViewer, entity?: CadEntity) {
		const selected = cad.objects[entity?.id]?.userData.selected;
		this.color = params.color || entity?.color || 0;
		if (selected) {
			this.color = cad.config.selectedColor;
		}
		if (cad.config.reverseSimilarColor) {
			this.color = cad.correctColor(this.color);
		}
		this.lineWidth = params.lineWidth || 1;
		let eFontSize: number = null;
		if (entity instanceof CadMtext || entity instanceof CadDimension) {
			eFontSize = entity.font_size;
		}
		this.fontSize = params.fontSize || eFontSize || 16;
	}
}

export interface CadViewerConfig {
	backgroundColor?: number;
	selectedColor?: number;
	hoverColor?: number;
	showLineLength?: number;
	maxScale?: number;
	minScale?: number;
	padding?: number[] | number;
	selectMode?: "none" | "single" | "multiple";
	fontSize?: number;
	dragAxis?: "x" | "y" | "xy" | "";
	transparent?: boolean;
	fps?: number;
	drawMTexts?: boolean;
	drawDimensions?: boolean;
	drawPolyline?: boolean;
	reverseSimilarColor?: true;
}
export class CadViewer {
	data: CadData;
	config: CadViewerConfig = {
		backgroundColor: 0,
		selectedColor: 0xffff00,
		hoverColor: 0x00ffff,
		showLineLength: 0,
		maxScale: 5,
		minScale: 0.1,
		padding: [0],
		selectMode: "none",
		fontSize: 17,
		dragAxis: "xy",
		transparent: false,
		fps: 60,
		drawMTexts: false,
		drawDimensions: false,
		drawPolyline: false,
		reverseSimilarColor: true
	};
	width: number;
	height: number;
	dom: HTMLDivElement;
	container = new Group();
	scene: Scene;
	camera: PerspectiveCamera;
	renderer: WebGLRenderer;
	objects: {[key: string]: Object3D} = {};
	raycaster = new Raycaster();
	currentObject: Object3D;
	controls: CadViewerControls;
	private _renderTimer = {id: null, time: 0};
	private _destroyed = false;

	constructor(data: CadData, width = 300, height = 150, config: CadViewerConfig = {}) {
		if (data instanceof CadData) {
			this.data = data;
		} else {
			this.data = new CadData(data);
		}
		this.config = {...this.config, ...config};
		const padding = this.config.padding;
		if (typeof padding === "number") {
			this.config.padding = [padding, padding, padding, padding];
		} else if (!Array.isArray(padding) || padding.length === 0) {
			this.config.padding = [0, 0, 0, 0];
		} else if (padding.length === 0) {
			this.config.padding = [0, 0, 0, 0];
		} else if (padding.length === 1) {
			this.config.padding = [padding[0], padding[0], padding[0], padding[0]];
		} else if (padding.length === 2) {
			this.config.padding = [padding[0], padding[1], padding[0], padding[1]];
		} else if (padding.length === 3) {
			this.config.padding = [padding[0], padding[1], padding[0], padding[2]];
		}

		const scene = new Scene();
		const camera = new PerspectiveCamera(60, width / height, 0.1, 15000);
		const renderer = new WebGLRenderer({preserveDrawingBuffer: true});
		renderer.setSize(width, height);

		camera.position.set(0, 0, 0);
		camera.lookAt(0, 0, 0);
		// camera.up.set(0, 0, 1);
		const l = new Vector3();
		l.applyQuaternion(camera.quaternion);

		const stats = Stats();
		document.body.appendChild(stats.dom);

		const dom = document.createElement("div");
		dom.appendChild(renderer.domElement);
		dom.id = data.id;
		dom.setAttribute("name", data.name);
		dom.classList.add("cad-viewer");
		this.dom = dom;
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.width = width;
		this.height = height;

		const animate = () => {
			requestAnimationFrame(animate.bind(this));
			const {renderer, camera, scene} = this;
			renderer.render(scene, camera);
			stats.update();
		};
		animate();
		this.render(true);
	}

	setControls(config: CadViewerControlsConfig) {
		if (this.controls) {
			for (const name in this.controls.config) {
				if (config[name] !== undefined) {
					this.controls.config[name] = config[name];
				}
			}
		} else {
			this.controls = new CadViewerControls(this, config);
		}
		return this;
	}

	render(center = false, entities?: CadEntities, style?: CadStyle) {
		const now = new Date().getTime();
		const then = this._renderTimer.time + (1 / this.config.fps) * 1000;
		if (now < then) {
			window.clearTimeout(this._renderTimer.id);
			this._renderTimer.id = setTimeout(() => this.render(center, entities, style), then - now);
			return this;
		}
		this._renderTimer.time = now;
		if (!entities) {
			entities = this.data.getAllEntities();
		}
		if (center) {
			this.center();
		}
		entities.line.forEach((e) => this._drawLine(e, style));
		entities.arc.forEach((e) => this._drawArc(e, style));
		entities.circle.forEach((e) => this._drawCircle(e, style));
		entities.mtext.forEach((e) => this._drawMtext(e, style));
		entities.dimension.forEach((e) => this._drawDimension(e, style));
		return this;
	}

	center(entities?: CadEntities) {
		const rect = this.getBounds(entities);
		const fov = MathUtils.degToRad(this.camera.fov);
		const aspect = this.camera.aspect;
		const aspectRect = rect.width / rect.height;
		const width = aspect > aspectRect ? rect.height * aspect : rect.width;
		const z = width / (2 * Math.tan(fov / 2) * aspect);
		this.camera.position.set(rect.x, rect.y, z);
		this.camera.lookAt(rect.x, rect.y, 0);
		return this;
	}

	getBounds(entities?: CadEntities) {
		let maxX = -Infinity;
		let minX = Infinity;
		let maxY = -Infinity;
		let minY = Infinity;
		const calc = (point: Vector2) => {
			maxX = Math.max(point.x, maxX);
			maxY = Math.max(point.y, maxY);
			minX = Math.min(point.x, minX);
			minY = Math.min(point.y, minY);
		};
		if (!entities) {
			entities = this.data.getAllEntities();
		}
		entities.line.forEach((entity) => {
			const {start, end} = entity;
			calc(new Vector2(...start));
			calc(new Vector2(...end));
		});
		entities.arc.forEach((entity) => {
			const arcEntity = entity;
			const {center, radius, start_angle, end_angle, clockwise} = arcEntity;
			const arc = new ArcCurve(
				center[0],
				center[1],
				radius,
				MathUtils.degToRad(start_angle),
				MathUtils.degToRad(end_angle),
				clockwise
			);
			calc(arc.getPoint(0));
			calc(arc.getPoint(1));
		});
		entities.circle.forEach((entity) => {
			const {center, radius} = entity;
			calc(new Vector2(...center).addScalar(radius));
			calc(new Vector2(...center).subScalar(radius));
		});
		if (!isFinite(maxX + minX) || !isFinite(maxY + minY)) {
			return {x: 0, y: 0, width: 0, height: 0};
		}
		return {x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY};
	}

	private _getZ(rect: {x: number; y: number; width: number; height: number}) {
		const fov = MathUtils.degToRad(this.camera.fov);
		const aspect = this.camera.aspect;
		const aspectRect = rect.width / rect.height;
		const width = aspect > aspectRect ? rect.height * aspect : rect.width;
		const z = width / (2 * Math.tan(fov / 2) * aspect);
		const h = Math.tan(fov / 2) * z * 2;
		const w = h * aspect;
		console.log(w / this.width, h / this.height);
		return z;
	}

	private _drawLine(entity: CadLine, style: CadStyle = {}) {
		const {scene, objects} = this;
		const start = new Vector3(...entity.start);
		const end = new Vector3(...entity.end);
		const {lineWidth, color} = new CadStyle(style, this, entity);
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints([start, end]);
			(line.material as LineBasicMaterial).setValues({color, linewidth: lineWidth});
		} else {
			const geometry = new Geometry().setFromPoints([start, end]);
			const material = new LineBasicMaterial({color, linewidth: lineWidth});
			const line = new Line(geometry, material);
			line.userData.selectable = true;
			line.name = entity.id;
			objects[entity.id] = line;
			scene.add(line);
		}
	}

	private _drawCircle(entity: CadCircle, style: CadStyle = {}) {
		const {scene, objects} = this;
		const {radius} = entity;
		const center = new Vector3(...entity.center);
		const curve = new EllipseCurve(center.x, center.y, radius, radius, 0, Math.PI * 2, true, 0);
		const points = curve.getPoints(50);
		const {lineWidth, color} = new CadStyle(style, this, entity);
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints(points);
			(line.material as LineBasicMaterial).setValues({color, linewidth: lineWidth});
		} else {
			const geometry = new Geometry().setFromPoints(points);
			const material = new LineBasicMaterial({color, linewidth: lineWidth});
			const line = new Line(geometry, material);
			line.userData.selectable = true;
			line.name = entity.id;
			objects[entity.id] = line;
			scene.add(line);
		}
	}

	private _drawArc(entity: CadArc, style: CadStyle = {}) {
		const {scene, objects} = this;
		const {radius, start_angle, end_angle, clockwise} = entity;
		const center = new Vector3(...entity.center);
		const curve = new EllipseCurve(
			center.x,
			center.y,
			radius,
			radius,
			MathUtils.degToRad(start_angle),
			MathUtils.degToRad(end_angle),
			clockwise,
			0
		);
		const points = curve.getPoints(50);
		const {lineWidth, color} = new CadStyle(style, this, entity);
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints(points);
			(line.material as LineBasicMaterial).setValues({color, linewidth: lineWidth});
		} else {
			const geometry = new Geometry().setFromPoints(points);
			const material = new LineBasicMaterial({color, linewidth: lineWidth});
			const line = new Line(geometry, material);
			line.userData.selectable = true;
			line.name = entity.id;
			objects[entity.id] = line;
			scene.add(line);
		}
	}

	private _drawMtext(entity: CadMtext, style: CadStyle = {}) {
		const {scene, objects} = this;
		const {fontSize, color} = new CadStyle(style, this, entity);
		const colorStr = "#" + new Color(color).getHexString();
		const text = entity.text || "";
		if (objects[entity.id]) {
			// const sprite = objects[entity.id] as TextSprite;
		} else {
			const sprite = new TextSprite({fontSize: fontSize * 1.25, fillStyle: colorStr, text});
			sprite.userData.selectable = true;
			sprite.name = entity.id;
			sprite.position.set(...entity.insert);
			sprite.padding = 0;
			const offset = new Vector2(...entity.anchor).subScalar(0.5).multiply(new Vector2(-sprite.width, sprite.height));
			sprite.position.add(new Vector3(offset.x, offset.y, 0));
			objects[entity.id] = sprite;
			scene.add(sprite);
		}
	}

	private _drawDimension(entity: CadDimension, style: CadStyle = {}) {
		const {scene, objects} = this;
		const {mingzi, qujian, axis, distance} = entity;
		const {lineWidth, color, fontSize} = new CadStyle(style, this, entity);
		const colorStr = "#" + new Color(color).getHexString();
		if (!entity.entity1 || !entity.entity2 || !entity.entity1.id || !entity.entity2.id) {
			return;
		}
		const entity1 = this.data.findEntity(entity.entity1.id) as CadLine;
		const entity2 = this.data.findEntity(entity.entity2.id) as CadLine;
		if (!entity1) {
			console.warn(`线段${entity1.id}没找到`);
			return null;
		}
		if (!entity2) {
			console.warn(`线段${entity2.id}没找到`);
			return null;
		}
		if (entity1.type !== CadTypes.Line) {
			console.warn(`实体${entity1.id}不是线段`);
			return null;
		}
		if (entity2.type !== CadTypes.Line) {
			console.warn(`实体${entity2.id}不是线段`);
			return null;
		}

		const getPoint = (e: CadLine, location: string) => {
			if (location === "start") {
				return new Vector3(...e.start);
			}
			if (location === "end") {
				return new Vector3(...e.start);
			}
			if (location === "center") {
				return new Vector3(...e.start).add(new Vector3(...e.end)).divideScalar(2);
			}
		};
		let p1 = getPoint(entity1, entity.entity1.location);
		let p2 = getPoint(entity2, entity.entity2.location);
		let p3 = p1.clone();
		let p4 = p2.clone();
		const arrow1: Vector3[] = [];
		const arrow2: Vector3[] = [];
		const arrowSize = 1;
		const arrowLength = arrowSize * Math.sqrt(3);
		if (axis === "x") {
			const y = Math.max(p3.y, p4.y);
			p3.y = y + distance;
			p4.y = y + distance;
			if (p3.x > p4.x) {
				[p3, p4] = [p4, p3];
				[p1, p2] = [p2, p1];
			}
			arrow1[0] = p3.clone();
			arrow1[1] = arrow1[0].clone().add(new Vector3(arrowLength, -arrowSize));
			arrow1[2] = arrow1[0].clone().add(new Vector3(arrowLength, arrowSize));
			arrow2[0] = p4.clone();
			arrow2[1] = arrow2[0].clone().add(new Vector3(-arrowLength, -arrowSize));
			arrow2[2] = arrow2[0].clone().add(new Vector3(-arrowLength, arrowSize));
		}
		if (axis === "y") {
			const x = Math.max(p3.x, p4.x);
			p3.x = x + distance;
			p4.x = x + distance;
			if (p3.y < p4.y) {
				[p3, p4] = [p4, p3];
				[p1, p2] = [p2, p1];
			}
			arrow1[0] = p3.clone();
			arrow1[1] = arrow1[0].clone().add(new Vector3(-arrowSize, -arrowLength));
			arrow1[2] = arrow1[0].clone().add(new Vector3(arrowSize, -arrowLength));
			arrow2[0] = p4.clone();
			arrow2[1] = arrow2[0].clone().add(new Vector3(-arrowSize, arrowLength));
			arrow2[2] = arrow2[0].clone().add(new Vector3(arrowSize, arrowLength));
		}

		let line: Line;
		if (objects[entity.id]) {
			// const sprite = objects[entity.id] as TextSprite;
			line = objects[entity.id] as Line;
			line.remove(...line.children);
		} else {
			const geometry = new Geometry().setFromPoints([p1, p3, p4, p2]);
			const material = new LineBasicMaterial({color, linewidth: lineWidth});
			line = new Line(geometry, material);
			line.renderOrder = -1;
			line.userData.selectable = false;
			line.name = entity.id;
			objects[entity.id] = line;
			scene.add(line);
		}
		const arrowShape1 = new Shape();
		arrowShape1.moveTo(arrow1[0].x, arrow1[0].y);
		arrowShape1.lineTo(arrow1[1].x, arrow1[1].y);
		arrowShape1.lineTo(arrow1[2].x, arrow1[2].y);
		arrowShape1.closePath();
		const arrowShape2 = new Shape();
		arrowShape2.moveTo(arrow2[0].x, arrow2[0].y);
		arrowShape2.lineTo(arrow2[1].x, arrow2[1].y);
		arrowShape2.lineTo(arrow2[2].x, arrow2[2].y);
		arrowShape2.closePath();
		line.add(new Mesh(new ShapeGeometry(arrowShape1), new MeshBasicMaterial({color})));
		line.add(new Mesh(new ShapeGeometry(arrowShape2), new MeshBasicMaterial({color})));
		let text = "";
		if (mingzi) {
			text = mingzi;
		}
		if (qujian) {
			text = qujian;
		}
		if (text === "") {
			text = "<>";
		}
		text = text.replace("<>", p3.distanceTo(p4).toFixed(2));
		if (axis === "y") {
			text.split("").join("\n");
		}
		const sprite = new TextSprite({fontSize, fillStyle: colorStr, text});
		// const sprite = new TextSprite({fontSize:200, fillStyle: "#ffffff", text: "AWEgw"});
		const midPoint = new Vector3().add(p3).add(p4).divideScalar(2);
		sprite.position.copy(midPoint);
		sprite.center.set(0.5, 1);
		if (axis === "y") {
			sprite.lineGap = 0;
		}
		line.add(sprite);
	}

	moveComponent(curr: CadData, translate: Vector2, prev?: CadData) {}

	get position() {
		return this.camera.position;
	}

	get scale() {
		return CAMERA_Z / this.camera.position.z;
	}
	set scale(value) {
		const {maxScale, minScale} = this.config;
		value = Math.max(minScale, Math.min(maxScale, value));
		this.camera.position.z = CAMERA_Z / value;
	}

	correctColor(color: number, threshold = 5) {
		if (typeof color === "number" && Math.abs(color - this.config.backgroundColor) <= threshold) {
			return 0xfffffff - color;
		}
		return color;
	}

	get selectedEntities() {
		const result = this.data.getAllEntities().filter((e) => {
			const object = this.objects[e.id];
			return object && object.userData.selected;
		});
		return result;
	}

	unselectAll() {
		Object.values(this.objects).forEach((o) => (o.userData.selected = false));
		return this.render();
	}

	exportImage() {
		const image = new Image();
		image.src = this.renderer.domElement.toDataURL();
		return image;
	}

	destroy() {
		if (this._destroyed) {
			console.warn("This cad has already been destroyed.");
		} else {
			this.scene.dispose();
			this.renderer.dispose();
			this.data = null;
			this._destroyed = true;
		}
	}

	reset(data: CadData) {
		this.scene.remove(...Object.values(this.objects));
		this.objects = {};
		this.data = data;
		return this.render();
	}
}
