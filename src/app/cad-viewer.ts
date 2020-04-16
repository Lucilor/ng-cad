import {CadData, Config, defaultConfig, transformData, CadEntity, CadTypes, CadLine, CadArc, CadCircle, Events} from "@lucilor/cad-viewer";
import {index2RGB} from "@lucilor/utils";
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
	Box3,
	BufferGeometry,
	BufferAttribute,
	DynamicDrawUsage,
	Float32BufferAttribute
} from "three";
import OrbitControls from "orbit-controls-es6";
import {EventEmitter} from "events";
import Stats from "stats.js";

export interface LineStyle {
	color?: number;
	lineWidth?: number;
}

export interface TextStyle {
	color?: number;
	fontSize?: number;
}

declare type MouseEvent0 = (event: PointerEvent) => void;
declare type WheelEvent0 = (event: WheelEvent) => void;
declare type KeyboardEvent0 = (event: KeyboardEvent) => void;
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
	raycaster = new Raycaster();
	currentObject: Object3D;
	private _renderTimer = {id: null, time: 0};
	private _events: {
		onDragStart: MouseEvent0;
		onDrag: MouseEvent0;
		onDragEnd: MouseEvent0;
		onWheel: WheelEvent0;
		onKeyDown: KeyboardEvent0;
	};
	private _status = {
		pFrom: new Vector2(),
		pTo: new Vector2(),
		dragging: false,
		button: -10,
		componentName: ""
	};
	private _emitter = new EventEmitter();
	private _multiSelector: Line;
	private _cameraZ = 0;

	constructor(data: CadData, width = 300, height = 150, config: Config = {}) {
		transformData(data, "array");
		this.data = {
			entities: {line: [], arc: [], circle: [], hatch: [], dimension: [], mtext: []},
			baseLines: [],
			jointPoints: [],
			options: [],
			conditions: [],
			type: "",
			partners: [],
			components: {data: [], connections: []},
			...data
		};
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
		this._events = {onDragStart: () => {}, onDrag: () => {}, onDragEnd: () => {}, onWheel: () => {}, onKeyDown: () => {}};

		const scene = new Scene();
		const camera = new PerspectiveCamera(60, width / height, 0.1, 15000);
		const renderer = new WebGLRenderer();
		renderer.setSize(width, height);

		camera.position.set(0, 0, 0);
		camera.lookAt(0, 0, 0);
		// camera.up.set(0, 0, 1);
		const l = new Vector3();
		l.applyQuaternion(camera.quaternion);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enabled = false;
		controls.maxDistance = 15000;
		controls.minDistance = 0;
		console.log(controls);

		const stats = new Stats();
		document.body.appendChild(stats.dom);

		const view = renderer.domElement;
		this.view = view;
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.controls = controls;
		this.width = width;
		this.height = height;

		view.addEventListener("pointerdown", (event) => this._events.onDragStart(event));
		view.addEventListener("pointermove", (event) => {
			this._events.onDrag(event);
			let object = this._getInterSection(new Vector2(event.clientX, event.clientY));
			if (object && object.userData.selected !== true) {
				if (object instanceof Line) {
					if (object.material instanceof LineBasicMaterial) {
						object.material.color.set(this.config.hoverColor);
					}
				}
			} else if (this.currentObject && this.currentObject.userData.selected !== true) {
				object = this.currentObject;
				if (object instanceof Line) {
					if (object.material instanceof LineBasicMaterial) {
						object.material.color.set(this.findEntity(object.name)?.colorRGB);
					}
				}
			}
		});
		["pointercancel", "pointerleave", "pointerout", "pointerup"].forEach((v) => {
			view.addEventListener(v, (event: PointerEvent) => this._events.onDragEnd(event));
		});
		view.addEventListener("wheel", (event) => this._events.onWheel(event));
		view.addEventListener("keydown", (event) => this._events.onKeyDown(event));

		// multiSelector
		(() => {
			const geometry = new BufferGeometry();
			const material = new LineBasicMaterial({color: this._correctColor(0xffffff)});
			const line = new Line(geometry, material);
			scene.add(line);
			line.name = "multiSelector";
			line.renderOrder = 1;
			this._multiSelector = line;
		})();

		const animate = () => {
			requestAnimationFrame(animate.bind(this));
			const {renderer, camera, scene} = this;
			// this.camera.lookAt(this.camera.position.clone().multiply(new Vector3(1, 1, 0)));
			renderer.render(scene, camera);
			stats.update();
		};
		animate();
		// this.drawLine({id: "awew", layer: "", color: 1, type: "LINE", start: [0, -innerHeight / 2, 0], end: [0, innerHeight / 2, 0]});
	}

	private _getNDC(position: Vector2) {
		const rect = this.view.getBoundingClientRect();
		return new Vector3(((position.x - rect.left) / rect.width) * 2 - 1, (-(position.y - rect.top) / rect.height) * 2 + 1, 0.5);
	}

	private _getScreenPosition(position: Vector3) {
		const rect = this.view.getBoundingClientRect();
		const {x, y} = position.clone().project(this.camera);
		return new Vector2(Math.floor(((x + 1) * rect.width) / 2 + rect.left), Math.floor(((1 - y) * rect.height) / 2 + rect.top));
	}

	private _getInterSection(pointer: Vector2) {
		const {raycaster, camera, objects} = this;
		raycaster.setFromCamera(this._getNDC(pointer), camera);
		const intersects = raycaster.intersectObjects(Object.values(objects));
		if (intersects.length) {
			this.currentObject = intersects[0].object;
			return this.currentObject;
		}
		return null;
	}

	enableDragging(onDragStart?: MouseEvent0, onDrag?: MouseEvent0, onDragEnd?: MouseEvent0) {
		const flags = [true, true, true];
		if (typeof onDragStart !== "function") {
			onDragStart = (event) => {
				const {clientX: x, clientY: y} = event instanceof TouchEvent ? event.targetTouches[0] : event;
				this._status.pFrom.set(x, y);
				this._status.pTo.set(x, y);
				this._status.dragging = true;
				this._emitter.emit(Events.dragstart, event);
				this._status.button = (event as MouseEvent).button;
			};
			flags[0] = false;
		}
		if (typeof onDrag !== "function") {
			onDrag = (event) => {
				const p = new Vector2(event.clientX, event.clientY);
				if (this._status.dragging) {
					const {pFrom, pTo, componentName} = this._status;
					if (this._status.button === 1 || (event.shiftKey && this._status.button === 0)) {
						const offset = new Vector2(p.x - pTo.x, pTo.y - p.y);
						const scale = this.position.z / this._cameraZ;
						offset.multiplyScalar(scale);
						if (componentName) {
							const component = this.data.components.data.find((v) => v.name === componentName);
							if (component) {
								this.moveComponent(component, offset);
								this.render(false, 0b001);
							}
						} else {
							if (!this.config.dragAxis.includes("x")) {
								offset.x = 0;
							}
							if (!this.config.dragAxis.includes("y")) {
								offset.y = 0;
							}
							this.position.sub(new Vector3(offset.x, offset.y, 0));
						}
					} else {
						if (this.config.selectMode === "multiple") {
							const {x: x1, y: y1} = pFrom;
							const {x: x2, y: y2} = pTo;
							const box = new Box3(new Vector3(x1, y1, -10), new Vector3(x2, y2, this.position.z + 10));
							// const points = [pFrom, new Vector2(pFrom.x, pTo.y), pTo, new Vector2(pTo.x, pFrom.y), pFrom].map((p) =>
							// 	this._getNDC(p).unproject(this.camera).toArray()
							// );
							const arr = [x1, y1, 0, x1, y2, 0, x2, y2, 0, x2, y1, 0, x1, y1, 0];
							const line = this._multiSelector as Line;
							line.visible = true;
							const geometry = line.geometry as BufferGeometry;
							const position = new Float32BufferAttribute(arr, 3);
							position.needsUpdate = true;
							geometry.setAttribute("position", position);
							// geometry.
							// (geometry.getAttribute("position") as Float32BufferAttribute).setUsage(DynamicDrawUsage);
							// (geometry.getAttribute("position") as Float32BufferAttribute).needsUpdate = true;
							// console.log(geometry.getAttribute("position"));
						}
					}
				}
				this._emitter.emit(Events.drag, event);
				this._status.pTo.set(p.x, p.y);
			};
			flags[1] = false;
		}
		if (typeof onDragEnd !== "function") {
			onDragEnd = (event) => {
				const p = new Vector2(event.clientX, event.clientY);
				const {pFrom, pTo, dragging} = this._status;
				if (dragging) {
					this._multiSelector.visible = false;
					// if (this.config.selectMode === "multiple" && event instanceof MouseEvent && event.button === 0) {
					// 	const box = new Box3(new Vector3(pFrom.x, pFrom.y, -10), new Vector3(pTo.x, pTo.y, this.position.z + 10));
					// 	const toBeSelected: CadEntity[] = [];
					// 	for (const entity of this.data.entities) {
					// 		if (!entity.selectable) {
					// 			continue;
					// 		}
					// 		if (entity.type === CadTypes.Line) {
					// 			const lineEntity = entity as CadLine;
					// 			const start = this.translatePoint(new Point(lineEntity.start));
					// 			const end = this.translatePoint(new Point(lineEntity.end));
					// 			if (box.containsLine(new Line(start, end))) {
					// 				toBeSelected.push(entity);
					// 			}
					// 		} else if (entity.type === CadTypes.Arc) {
					// 			const arcEntity = entity as CadArc;
					// 			const start = new Angle(arcEntity.start_angle, "deg");
					// 			const end = new Angle(arcEntity.end_angle, "deg");
					// 			const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, start, end);
					// 			if (
					// 				box.containsPoint(this.translatePoint(arc.startPoint)) &&
					// 				box.containsPoint(this.translatePoint(arc.endPoint))
					// 			) {
					// 				toBeSelected.push(entity);
					// 			}
					// 		} else if (entity.type === CadTypes.Circle) {
					// 			const circleEntity = entity as CadCircle;
					// 			const center = this.translatePoint(new Point(circleEntity.center));
					// 			if (box.containsPoint(center)) {
					// 				toBeSelected.push(entity);
					// 			}
					// 		}
					// 	}
					// 	const allSelected = toBeSelected.every((e) => e.selected);
					// 	toBeSelected.forEach((entity) => (entity.selected = !allSelected));
					// 	this.render(false, null, toBeSelected);
					// }
					this._emitter.emit(Events.dragend, event);
				}
				const offset = new Vector2(p.x - pTo.x, pTo.y - p.y);
				if (Math.abs(offset.x) < 5 && Math.abs(offset.y) < 5) {
					const object = this._getInterSection(p);
					if (object) {
						if (object.userData.selected === true) {
							if (object instanceof Line) {
								if (object.material instanceof LineBasicMaterial) {
									object.userData.selected = false;
									object.material.color.set(this.findEntity(object.name)?.colorRGB);
								}
							}
						} else {
							if (object instanceof Line) {
								if (object.material instanceof LineBasicMaterial) {
									object.userData.selected = true;
									object.material.color.set(this.config.selectedColor);
								}
							}
						}
					}
				}
				this._status.dragging = false;
			};
			flags[2] = false;
		}
		if (new Set(flags).size > 1) {
			console.warn("正常情况下，设置拖拽事件时你应该同时设置3个（前中后）事件。");
		}
		this._events.onDragStart = onDragStart;
		this._events.onDrag = onDrag;
		this._events.onDragEnd = onDragEnd;
		return this;
	}

	enableWheeling(onWheel?: WheelEvent0) {
		if (typeof onWheel !== "function") {
			onWheel = (event) => {
				if (event.deltaY > 0) {
					this.camera.position.z += 50;
				} else if (event.deltaY < 0) {
					this.camera.position.z -= 50;
				}
			};
		}
		this._events.onWheel = onWheel;
		return this;
	}

	// enableKeyboard(onKeyDown?: KeyboardEvent0) {
	// 	const {view} = this;
	// 	const step = 10 / this._scale;
	// 	view.tabIndex = 0;
	// 	view.focus();
	// 	if (typeof onKeyDown !== "function") {
	// 		onKeyDown = (event) => {
	// 			const {x, y} = this.position;
	// 			switch (event.key) {
	// 				case "w":
	// 				case "ArrowUp":
	// 					this.position = new Point(x, y + step);
	// 					break;
	// 				case "a":
	// 				case "ArrowLeft":
	// 					this.position = new Point(x - step, y);
	// 					break;
	// 				case "s":
	// 				case "ArrowDown":
	// 					this.position = new Point(x, y - step);
	// 					break;
	// 				case "d":
	// 				case "ArrowRight":
	// 					this.position = new Point(x + step, y);
	// 					break;
	// 				case "Escape":
	// 					this.unselectAll();
	// 					break;
	// 				default:
	// 			}
	// 		};
	// 	}
	// 	this._events.onKeyDown = onKeyDown;
	// 	return this;
	// }

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
				localStyle.color = this._correctColor(this.config.selectedColor);
			} else {
				localStyle.color = this._correctColor(entity.colorRGB);
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
				this.flatEntities().forEach((entity) => draw(entity));
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
		const rect = this.getBounds(entities);
		const fov = MathUtils.degToRad(this.camera.fov);
		const aspect = this.camera.aspect;
		const aspectRect = rect.width / rect.height;
		const width = aspect > aspectRect ? rect.height * aspect : rect.width;
		const z = width / (2 * Math.tan(fov / 2) * aspect);
		this.camera.position.set(rect.x, rect.y, z);
		this.camera.lookAt(rect.x, rect.y, 0);
		this._cameraZ = z;
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

		const lineWidth = style && style.lineWidth ? style.lineWidth : entity.lineWidth;
		let colorRGB = entity.colorRGB;
		if (style && style.color) {
			colorRGB = style.color;
		}

		if (objects[entity.id]) {
			const line = objects[entity.id] as Line;
			line.geometry.setFromPoints([start, end]);
		} else {
			const geometry = new Geometry().setFromPoints([start, end]);
			const material = new LineBasicMaterial({color: colorRGB, linewidth: lineWidth});
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
		return this.camera.position.z / this._cameraZ;
	}
	set scale(value) {
		this.camera.position.z = this._cameraZ * value;
	}

	private _correctColor(color: number, threshold = 5) {
		if (typeof color === "number" && Math.abs(color - this.config.backgroundColor) <= threshold && this.config.reverseSimilarColor) {
			return 0xfffffff - color;
		}
		return color;
	}
}
