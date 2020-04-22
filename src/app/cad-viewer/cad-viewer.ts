import {Config, defaultConfig, transformData} from "@lucilor/cad-viewer";
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
	BufferGeometry,
	Box2
} from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import {CadViewerControls, CadViewerControlsConfig} from "./cad-viewer-controls";
import {CadData, CadEntity, CadLine, CadTypes, CadArc, CadCircle, CadEntities} from "./cad-data";

export interface LineStyle {
	color?: number;
	lineWidth?: number;
}

export interface TextStyle {
	color?: number;
	fontSize?: number;
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

	render(center = false, entities?: CadEntities, style: LineStyle = {}) {
		const now = new Date().getTime();
		const then = this._renderTimer.time + (1 / this.config.fps) * 1000;
		if (now < then) {
			window.clearTimeout(this._renderTimer.id);
			this._renderTimer.id = setTimeout(() => this.render(center, entities, style), then - now);
			return this;
		}
		this._renderTimer.time = now;
		const draw = (entity: CadEntity) => {
			if (!entity) {
				return;
			}
			const {color, layer} = entity;
			const lineWidth = 1;
			const localStyle = {...style};
			const object = this.objects[entity.id];
			if (object && object.userData.selected === true && localStyle.color === undefined) {
				localStyle.color = this.correctColor(this.config.selectedColor);
			} else {
				localStyle.color = this.correctColor(entity.color);
			}
			switch (entity.type) {
				case CadTypes.Line:
					this.drawLine(entity as CadLine, localStyle);
					break;
				// case CadTypes.Arc:
				// 	entity.lineWidth = lineWidth;
				// 	this.drawArc(entity as CadArc, localStyle, container);
				// 	break;
				// case CadTypes.Circle:
				// 	entity.lineWidth = lineWidth;
				// 	this.drawCircle(entity as CadCircle, localStyle, container);
				// 	break;
				// case CadTypes.MText:
				// 	if (this.config.drawMTexts) {
				// 		this.drawText(entity as CadMText, localStyle, container);
				// 	}
				// 	break;
				// case CadTypes.Dimension:
				// 	if (this.config.drawMTexts && this._status.dimensions.length < 1) {
				// 		this.drawText(entity as CadDimension, localStyle, container);
				// 	} else if (entity.container) {
				// 		entity.container.destroy();
				// 		entity.container = null;
				// 	}
				// 	break;
				// case CadTypes.LWPolyline:
				// 	entity.lineWidth = lineWidth;
				// 	if (this.config.drawPolyline) {
				// 		this.drawPolyline(entity as CadLWPolyline, localStyle, container);
				// 	}
				// 	break;
				// case CadTypes.Hatch:
				// 	this.drawHatch(entity as CadHatch, {color: this.correctColor(0)}, container);
				// 	break;
				default:
			}
		};
		if (!entities) {
			entities = this.data.getAllEntities();
		}
		entities.line.forEach((e) => {
			this.drawLine(e);
		});
		// this._status.dimensions.forEach(d => d?.destroy());
		// this._status.dimensions.length = 0;
		// if (this.config.drawDimensions) {
		// 	this._drawDimensions();
		// 	if (center) {
		// 		this.center();
		// 	}
		// }
		// const {x, y} = this.containers.inner.position;
		// this.containers.inner.setTransform(x, y, 1, -1, 0, 0, 0, 0, this.height);
		if (center) {
			this.center();
		}
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
		// let rect: PIXI.Rectangle;
		// this._status.dimensions.forEach(c => {
		// 	if (c) {
		// 		if (rect) {
		// 			rect.enlarge(c.getLocalBounds());
		// 		} else {
		// 			rect = c.getLocalBounds();
		// 		}
		// 	}
		// });
		// if (rect) {
		// 	maxX = Math.max(rect.right, maxX);
		// 	maxY = Math.max(rect.bottom, maxY);
		// 	minX = Math.min(rect.left, minX);
		// 	minY = Math.min(rect.top, minY);
		// }
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

	drawLine(entity: CadLine, style?: LineStyle) {
		const {scene, objects} = this;
		const start = new Vector3(...entity.start);
		const end = new Vector3(...entity.end);

		const lineWidth = style && style.lineWidth ? style.lineWidth : 1;
		let color = entity.color;
		if (style && style.color) {
			color = style.color;
		}

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
		if (typeof color === "number" && Math.abs(color - this.config.backgroundColor) <= threshold && this.config.reverseSimilarColor) {
			return 0xfffffff - color;
		}
		return color;
	}

	get selectedEntities() {
		const result = {};
		return {};
	}

	unselectAll() {}
}
