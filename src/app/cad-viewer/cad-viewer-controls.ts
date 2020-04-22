import {CadViewer} from "./cad-viewer";
import {Vector2, Vector3, Line, LineBasicMaterial, Object3D, MathUtils, Box2, BufferGeometry} from "three";

export interface CadViewerControlsConfig {
	dragAxis?: "x" | "y" | "xy";
	selectMode?: "none" | "single" | "multiple";
}

export class CadViewerControls {
	cad: CadViewer;
	config: CadViewerControlsConfig = {
		dragAxis: "xy",
		selectMode: "none"
	};
	currentObject: Object3D;
	private _status = {
		pFrom: new Vector2(),
		pTo: new Vector2(),
		dragging: false,
		button: NaN,
		componentName: ""
	};
	private _multiSelector: Line;
	constructor(cad: CadViewer, config?: CadViewerControlsConfig) {
		this.cad = cad;
		const dom = cad.dom;
		if (typeof config === "object") {
			for (const name in this.config) {
				if (config[name] !== undefined) {
					this.config[name] = config[name];
				}
			}
		}

		dom.addEventListener("pointerdown", (event) => {
			const {clientX: x, clientY: y} = event;
			this._status.pFrom.set(x, y);
			this._status.pTo.set(x, y);
			this._status.dragging = true;
			this._status.button = event.button;
		});
		dom.addEventListener("pointermove", (event) => {
			const p = new Vector2(event.clientX, event.clientY);
			const {cad} = this;
			const {button, dragging} = this._status;
			if (dragging) {
				const {pFrom, pTo, componentName} = this._status;
				if (button === 1 || (event.shiftKey && button === 0)) {
					const offset = new Vector2(p.x - pTo.x, pTo.y - p.y);
					offset.divideScalar(cad.scale);
					if (componentName) {
						const component = cad.data.components.data.find((v) => v.name === componentName);
						if (component) {
							cad.moveComponent(component, offset);
							cad.render();
						}
					} else {
						if (!this.config.dragAxis.includes("x")) {
							offset.x = 0;
						}
						if (!this.config.dragAxis.includes("y")) {
							offset.y = 0;
						}
						cad.position.sub(new Vector3(offset.x, offset.y, 0));
					}
				} else if (button === 0) {
					if (this.config.selectMode === "multiple") {
						const {x: x1, y: y1, z: z1} = this._getWorldPostion(pFrom);
						const {x: x2, y: y2, z: z2} = this._getWorldPostion(pTo);
						const points = [
							new Vector3(x1, y1, z1),
							new Vector3(x1, y2, z1),
							new Vector3(x2, y2, z2),
							new Vector3(x2, y1, z2),
							new Vector3(x1, y1, z1)
						];
						if (this._multiSelector) {
							const line = this._multiSelector as Line;
							const geometry = line.geometry as BufferGeometry;
							geometry.setFromPoints(points);
						} else {
							const geometry = new BufferGeometry().setFromPoints(points);
							const material = new LineBasicMaterial({color: this.cad.correctColor(0xffffff)});
							const line = new Line(geometry, material);
							cad.scene.add(line);
							line.name = "multiSelector";
							line.renderOrder = 1;
							this._multiSelector = line;
						}
					}
				}
			}
			this._status.pTo.set(p.x, p.y);
			let object = this._getInterSection(new Vector2(event.clientX, event.clientY));
			if (object && object.userData.selected !== true) {
				if (object instanceof Line) {
					if (object.material instanceof LineBasicMaterial) {
						object.material.color.set(cad.config.hoverColor);
					}
				}
			} else if (this.currentObject && this.currentObject.userData.selected !== true) {
				object = this.currentObject;
				if (object instanceof Line) {
					if (object.material instanceof LineBasicMaterial) {
						object.material.color.set(cad.findEntity(object.name)?.color);
					}
				}
			}
		});
		["pointercancel", "pointerleave", "pointerout", "pointerup"].forEach((v) => {
			dom.addEventListener(v, (event: PointerEvent) => {
				const {camera, scene, objects, config} = this.cad;
				const {pFrom, pTo, dragging} = this._status;
				if (dragging) {
					if (this._multiSelector) {
						scene.remove(this._multiSelector);
						this._multiSelector = null;
						const from = this._getNDC(pFrom);
						const to = this._getNDC(pTo);
						if (from.x > to.x) {
							[from.x, to.x] = [to.x, from.x];
						}
						if (from.y > to.y) {
							[from.y, to.y] = [to.y, from.y];
						}
						const fov = MathUtils.degToRad(camera.fov);
						const h = Math.tan(fov / 2) * camera.position.z * 2;
						const w = camera.aspect * h;
						const {x, y} = camera.position;
						const x1 = x + (w / 2) * from.x;
						const x2 = x + (w / 2) * to.x;
						const y1 = y + (h / 2) * from.y;
						const y2 = y + (h / 2) * to.y;
						const box = new Box2(new Vector2(x1, y1), new Vector2(x2, y2));
						const toSelect = [];
						for (const key in objects) {
							const object = objects[key] as Line;
							object.geometry.computeBoundingBox();
							const {min, max} = object.geometry.boundingBox;
							const objBox = new Box2(new Vector2(min.x, min.y), new Vector2(max.x, max.y));
							if (box.containsBox(objBox) && object.userData.selectable) {
								// object.userData.selected = true;
								toSelect.push(object);
							}
						}
						console.log(toSelect);
						if (toSelect.every((o) => o.userData.selected)) {
							toSelect.forEach((o) => (o.userData.selected = false));
						} else {
							toSelect.forEach((object) => {
								object.userData.selected = true;
								object.material.color.set(config.selectedColor);
							});
						}
					}
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
				}
				this._status.dragging = false;
				const p = new Vector2(event.clientX, event.clientY);
				const offset = new Vector2(p.x - pTo.x, pTo.y - p.y);
				if (Math.abs(offset.x) < 5 && Math.abs(offset.y) < 5) {
					const object = this._getInterSection(p);
					if (object) {
						if (object.userData.selected === true) {
							if (object instanceof Line) {
								if (object.material instanceof LineBasicMaterial) {
									object.userData.selected = false;
									object.material.color.set(cad.findEntity(object.name)?.color);
								}
							}
						} else if (object.userData.selectable !== false) {
							if (object instanceof Line) {
								if (object.material instanceof LineBasicMaterial) {
									object.userData.selected = true;
									object.material.color.set(cad.config.selectedColor);
								}
							}
						}
					}
				}
			});
		});
		dom.addEventListener("wheel", (event) => {
			if (event.deltaY > 0) {
				this.cad.camera.position.z += 50;
			} else if (event.deltaY < 0) {
				this.cad.camera.position.z -= 50;
			}
		});
		window.addEventListener("keydown", (event) => {
			const {cad} = this;
			const position = cad.position;
			const step = 10 / cad.scale;
			switch (event.key) {
				case "w":
				case "ArrowUp":
					position.y += step;
					break;
				case "a":
				case "ArrowLeft":
					position.x -= step;
					break;
				case "s":
				case "ArrowDown":
					position.y -= step;
					break;
				case "d":
				case "ArrowRight":
					position.x += step;
					break;
				case "Escape":
					this.cad.unselectAll();
					break;
				default:
			}
		});
	}

	private _getNDC(point: Vector2) {
		const rect = this.cad.dom.getBoundingClientRect();
		return new Vector3(((point.x - rect.left) / rect.width) * 2 - 1, (-(point.y - rect.top) / rect.height) * 2 + 1, 0.5);
	}

	private _getWorldPostion(point: Vector2) {
		return this._getNDC(point).unproject(this.cad.camera);
	}

	private _getScreenPosition(position: Vector3) {
		const rect = this.cad.dom.getBoundingClientRect();
		const {x, y} = position.clone().project(this.cad.camera);
		return new Vector2(Math.floor(((x + 1) * rect.width) / 2 + rect.left), Math.floor(((1 - y) * rect.height) / 2 + rect.top));
	}

	private _getInterSection(pointer: Vector2) {
		const {raycaster, camera, objects} = this.cad;
		raycaster.setFromCamera(this._getNDC(pointer), camera);
		const intersects = raycaster.intersectObjects(Object.values(objects));
		if (intersects.length) {
			this.currentObject = intersects[0].object;
			return this.currentObject;
		}
		return null;
	}
}
