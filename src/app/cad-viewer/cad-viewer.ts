import {Config, defaultConfig, CadDimension} from "@lucilor/cad-viewer";
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
	TextGeometry,
	FontLoader,
	Font,
	Color,
	ShapeGeometry,
	Shape,
	Mesh,
	MeshBasicMaterial
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import {CadViewerControls, CadViewerControlsConfig} from "./cad-viewer-controls";
import {CadData, CadEntity, CadLine, CadTypes, CadArc, CadCircle, CadEntities, CadMtext} from "./cad-data";
import TextSprite from "@seregpie/three.text-sprite";

export class CadStyle {
	color?: number;
	lineWidth?: number;
	fontSize?: number;
	constructor(cad: CadViewer, params: {color?: number; lineWidth?: number; fontSize?: number} = {}) {
		this.color = params.color || null;
		if (cad.config.reverseSimilarColor) {
			this.color = cad.correctColor(this.color);
		}
		this.lineWidth = params.lineWidth || null;
		this.fontSize = params.fontSize || null;
	}
}

export class CadViewer {
	data: CadData;
	config: Config;
	width: number;
	height: number;
	dom: HTMLDivElement;
	scene: Scene;
	camera: PerspectiveCamera;
	renderer: WebGLRenderer;
	objects: {[key: string]: Object3D} = {};
	raycaster = new Raycaster();
	currentObject: Object3D;
	controls: CadViewerControls;
	private _renderTimer = {id: null, time: 0};

	constructor(data: any, width = 300, height = 150, config: Config = {}) {
		this.data = new CadData(data);
		this.config = {...defaultConfig, ...config};
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
		const renderer = new WebGLRenderer();
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
			// this.camera.lookAt(this.camera.position.clone().multiply(new Vector3(1, 1, 0)));
			renderer.render(scene, camera);
			stats.update();
		};
		animate();
		this.render(true);

		// this.drawLine({id: "awew", layer: "", color: 1, type: "LINE", start: [0, -innerHeight / 2, 0], end: [0, innerHeight / 2, 0]});
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
		style = new CadStyle(this, style);
		entities.line.forEach((e) => this.drawLine(e, style));
		entities.arc.forEach((e) => this.drawArc(e, style));
		entities.circle.forEach((e) => this.drawCircle(e, style));
		entities.mtext.forEach((e) => this.drawMtext(e, style));
		entities.dimension.forEach((e) => this.drawDimension(e, style));
		return this;
	}

	center(entities?: CadEntity[]) {
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

	getBounds(entities?: CadEntity[]) {
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
			entities = this.flatEntities();
			// this._status.partners.forEach(i => {
			// 	entities = entities.concat(this.data.partners[i].entities);
			// });
			// this.data.components.data.forEach(v => (entities = entities.concat(v.entities)));
		}
		if (entities.length < 1) {
			return {x: 0, y: 0, width: 0, height: 0};
		}
		for (const entity of entities) {
			if (entity.type === CadTypes.Line) {
				const {start, end} = entity as CadLine;
				calc(new Vector2(...start));
				calc(new Vector2(...end));
			}
			if (entity.type === CadTypes.Arc) {
				const arcEntity = entity as CadArc;
				const {center, radius, start_angle, end_angle, clockwise} = arcEntity;
				const arc = new ArcCurve(
					center[0],
					center[1],
					radius,
					MathUtils.degToRad(start_angle),
					MathUtils.degToRad(end_angle),
					clockwise
				);
				// const start = new Angle(arcEntity.start_angle, "deg");
				// const end = new Angle(arcEntity.end_angle, "deg");
				// const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, start, end);
				calc(arc.getPoint(0));
				calc(arc.getPoint(1));
			}
			if (entity.type === CadTypes.Circle) {
				const {center, radius} = entity as CadCircle;
				calc(new Vector2(...center).addScalar(radius));
				calc(new Vector2(...center).subScalar(radius));
			}
		}
		return {x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY};
	}

	flatEntities(from = this.data, mode = 0b111) {
		let result: CadEntity[] = [];
		if (mode & 0b100) {
			result = result.concat(Object.values(from.entities).flat());
		}
		if (mode & 0b010) {
			from.partners.forEach((partner) => {
				result = result.concat(Object.values(partner.entities).flat());
			});
		}
		if (mode & 0b001) {
			from.components.data.forEach((component) => {
				result = result.concat(Object.values(component.entities).flat());
			});
		}
		return result;
	}

	drawLine(entity: CadLine, style: CadStyle = {}) {
		const {scene, objects} = this;
		const start = new Vector3(...entity.start);
		const end = new Vector3(...entity.end);
		const lineWidth = style.lineWidth ? style.lineWidth : 1;
		const color = style.color ? style.color : entity.color;
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints([start, end]);
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

	drawCircle(entity: CadCircle, style: CadStyle = {}) {
		const {scene, objects} = this;
		const {radius} = entity;
		const center = new Vector3(...entity.center);
		const curve = new EllipseCurve(center.x, center.y, radius, radius, 0, Math.PI * 2, true, 0);
		const points = curve.getPoints(50);
		const lineWidth = style.lineWidth ? style.lineWidth : 1;
		const color = style.color ? style.color : entity.color;
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints(points);
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

	drawArc(entity: CadArc, style: CadStyle = {}) {
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
		const lineWidth = style.lineWidth ? style.lineWidth : 1;
		const color = style.color ? style.color : entity.color;
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints(points);
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

	drawMtext(entity: CadMtext, style: CadStyle = {}) {
		const {scene, objects} = this;
		const color = style.color ? style.color : entity.color;
		const colorStr = "#" + new Color(color).getHexString();
		const fontSize = style.fontSize ? style.fontSize : entity.font_size;
		const text = entity.text || "";
		if (objects[entity.id]) {
			// const sprite = objects[entity.id] as TextSprite;
		} else {
			const sprite = new TextSprite({fontSize, fillStyle: colorStr, text});
			sprite.userData.selectable = true;
			sprite.name = entity.id;
			sprite.position.set(...entity.insert);
			objects[entity.id] = sprite;
			scene.add(sprite);
		}
	}

	drawDimension(entity: CadDimension, style: CadStyle = {}) {
		const {scene, objects} = this;
		const {mingzi, qujian, axis, distance} = entity;
		const color = style.color ? style.color : entity.color;
		const colorStr = "#" + new Color(color).getHexString();
		const fontSize = style.fontSize ? style.fontSize : entity.font_size;
		const lineWidth = style.lineWidth ? style.lineWidth : 1;
		if (!entity.entity1 || !entity.entity2 || !entity.entity1.id || !entity.entity2.id) {
			return;
		}
		const entity1 = this.findEntity(entity.entity1.id) as CadLine;
		const entity2 = this.findEntity(entity.entity2.id) as CadLine;
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
			line.children.forEach((o) => o.remove());
		} else {
			const geometry = new Geometry().setFromPoints([p1, p3, p4, p2]);
			const material = new LineBasicMaterial({color, linewidth: lineWidth});
			line = new Line(geometry, material);
			line.renderOrder = -1;
			line.userData.selectable = true;
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
		console.log(sprite);
	}

	findLayerByName(layerName: string) {
		for (const layer of this.data.layers) {
			if (layer.name === layerName) {
				return layer;
			}
		}
		return null;
	}

	findEntity(id: string, entities: CadEntity[] | number = 0b111) {
		if (typeof entities === "number") {
			entities = this.flatEntities(this.data, entities);
		}
		for (const entity of entities) {
			if (entity.id === id) {
				return entity;
			}
		}
		return null;
	}

	moveComponent(curr: CadData, translate: Vector2, prev?: CadData) {}

	get position() {
		return this.camera.position;
	}

	get scale() {
		return 800 / this.camera.position.z;
	}
	set scale(value) {
		this.camera.position.z = 800 / value;
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
		this.render();
	}
}
