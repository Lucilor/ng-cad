import {
	CadData,
	Config,
	defaultConfig,
	transformData,
	CadEntity,
	CadTypes,
	CadLine,
	CadArc,
	CadCircle,
	CadHatch,
} from "@lucilor/cad-viewer";
import {index2RGB, Rectangle, Point, Angle, Arc} from "@lucilor/utils";
import {
	Scene,
	PerspectiveCamera,
	WebGLRenderer,
	LineBasicMaterial,
	Line3,
	Vector3,
	BufferGeometry,
	Line,
	Object3D,
	CameraHelper,
} from "three";
import OrbitControls from "orbit-controls-es6";

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
	view: HTMLCanvasElement;
	scene: Scene;
	camera: PerspectiveCamera;
	renderer: WebGLRenderer;
	objects: {[key: string]: Object3D} = {};
	controls: OrbitControls;
	private _renderTimer = {id: null, time: 0};

	constructor(data: CadData, width = 300, height = 150, config: Config = {}) {
		this.data = transformData(data, "array");
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
		const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
		const renderer = new WebGLRenderer();
		scene.add(new CameraHelper(camera));
		renderer.setSize(width, height);

		camera.position.set(0, 0, 300);
		camera.lookAt(0, 0, 0);
		const l = new Vector3();
		l.applyQuaternion(this.camera.quaternion);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enabled = true;
		controls.maxDistance = 1500;
		controls.minDistance = 0;
		console.log(controls);

		this.view = renderer.domElement;
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.controls = controls;
		this.width = width;
		this.height = height;

		const animate = () => {
			requestAnimationFrame(animate.bind(this));
			this.renderer.render(this.scene, this.camera);
			this.controls.update();
		};
		animate();
	}

	render(center = false, mode: number = 0b111, entities?: CadEntity[], style: LineStyle = {}) {
		const now = new Date().getTime();
		const then = this._renderTimer.time + (1 / this.config.fps) * 1000;
		if (now < then) {
			window.clearTimeout(this._renderTimer.id);
			this._renderTimer.id = setTimeout(() => this.render(center, mode, entities, style), then - now);
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
			if (entity.selectable !== false) {
				entity.selectable = true;
			}
			if (typeof entity.colorRGB !== "number") {
				if (color === 256) {
					const cadLayer = this.findLayerByName(layer);
					if (typeof cadLayer.colorRGB !== "number") {
						cadLayer.colorRGB = index2RGB(cadLayer.color, "number");
					}
					entity.colorRGB = cadLayer.colorRGB;
				} else {
					entity.colorRGB = index2RGB(color, "number");
				}
			}
			if (entity.selected === true && localStyle.color === undefined) {
				localStyle.color = this.correctColor(this.config.selectedColor);
			} else {
				localStyle.color = this.correctColor(entity.colorRGB);
			}
			switch (entity.type) {
				case CadTypes.Line:
					entity.lineWidth = lineWidth;
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
		if (entities) {
			entities.forEach((entity) => draw(entity));
		} else {
			if (mode & 0b100) {
				this.data.entities.forEach((entity) => draw(entity));
			}
			// if (mode & 0b010) {
			// 	this._status.partners.forEach(i => {
			// 		this.data.partners[i].entities.forEach(entity => draw(entity));
			// 	});
			// }
			// if (mode & 0b001) {
			// 	this.data.components.data.forEach((component, i) => {
			// 		component.entities.forEach(entity => draw(entity));
			// 	});
			// }
		}

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
		const {padding, maxScale, minScale} = this.config;
		const {width, height} = this;
		const rect = this.getBounds(entities);

		const scaleX = (width - padding[1] - padding[3]) / (rect.width + 10);
		const scaleY = (height - padding[0] - padding[2]) / (rect.height + 10);
		const scale = Math.min(scaleX, scaleY);
		this.config.minScale = Math.min(scale, minScale);
		this.config.maxScale = Math.max(scale, maxScale);
		// this.sketch.scale(scale);
		const positionX = (width - rect.width + (padding[3] - padding[1]) / scale) / 2 - rect.x;
		const positionY = (height - rect.height + (padding[2] - padding[0]) / scale) / 2 - rect.y;
		// this.sketch.translate(positionX, positionY);
		console.log(scale, positionX, positionY);
		return this;
	}

	getBounds(entities?: CadEntity[]) {
		let maxX = -Infinity;
		let minX = Infinity;
		let maxY = -Infinity;
		let minY = Infinity;
		const calc = (point: Point) => {
			maxX = Math.max(point.x, maxX);
			maxY = Math.max(point.y, maxY);
			minX = Math.min(point.x, minX);
			minY = Math.min(point.y, minY);
		};
		if (!entities) {
			entities = this.data.entities;
			// this._status.partners.forEach(i => {
			// 	entities = entities.concat(this.data.partners[i].entities);
			// });
			// this.data.components.data.forEach(v => (entities = entities.concat(v.entities)));
		}
		if (entities.length < 1) {
			return new Rectangle(new Point(), 0, 0);
		}
		for (const entity of entities) {
			if (entity.type === CadTypes.Line) {
				const {start, end} = entity as CadLine;
				calc(new Point(start));
				calc(new Point(end));
			}
			if (entity.type === CadTypes.Arc) {
				const arcEntity = entity as CadArc;
				const start = new Angle(arcEntity.start_angle, "deg");
				const end = new Angle(arcEntity.end_angle, "deg");
				const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, start, end);
				calc(arc.startPoint);
				calc(arc.endPoint);
			}
			if (entity.type === CadTypes.Circle) {
				const {center, radius} = entity as CadCircle;
				calc(new Point(center).add(radius));
				calc(new Point(center).sub(radius));
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
		return new Rectangle(new Point(minX, minY), maxX - minX, maxY - minY);
	}

	drawLine(entity: CadLine, style: LineStyle) {
		// const sketch = this.sketch;
		// const start = new Vector3(...entity.start);
		// const end = new Vector3(...entity.end);
		const {scene, objects} = this;
		const start = new Vector3(0, 0, 0);
		const end = new Vector3(100, 100, 100);
		const lineWidth = style && style.lineWidth ? style.lineWidth : entity.lineWidth;
		let colorRGB = entity.colorRGB;
		if (style && style.color) {
			colorRGB = style.color;
		}
		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints([start, end]);
		} else {
			const geometry = new BufferGeometry().setFromPoints([start, end]);
			const material = new LineBasicMaterial({color: colorRGB});
			const line = new Line(geometry, material);
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

	private correctColor(color: number, threshold = 5) {
		if (typeof color === "number" && Math.abs(color - this.config.backgroundColor) <= threshold && this.config.reverseSimilarColor) {
			return 0xfffffff - color;
		}
		return color;
	}
}
