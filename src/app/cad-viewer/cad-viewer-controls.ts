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
	private _multiSelector: HTMLDivElement;
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

		this._multiSelector = document.createElement("div");
		this._multiSelector.classList.add("cad-multi-selector");
		this._multiSelector.style.position = "absolute";
		this._multiSelector.style.backgroundColor = "rgba(29, 149, 234, 0.3)";
		this._multiSelector.style.border = "white solid 1px";
		this._multiSelector.hidden = true;
		dom.appendChild(this._multiSelector);

		dom.addEventListener("pointerdown", (event) => {
			const {clientX: x, clientY: y} = event;
			this._status.pFrom.set(x, y);
			this._status.pTo.set(x, y);
			this._status.dragging = true;
			this._status.button = event.button;
		});
		dom.addEventListener("pointermove", (event) => {
			const p = new Vector2(event.clientX, event.clientY);
			const {cad, currentObject} = this;
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
						this._multiSelector.hidden = false;
						this._multiSelector.style.left = Math.min(pFrom.x, pTo.x) + "px";
						this._multiSelector.style.top = Math.min(pFrom.y, pTo.y) + "px";
						this._multiSelector.style.width = Math.abs(pFrom.x - pTo.x) + "px";
						this._multiSelector.style.height = Math.abs(pFrom.y - pTo.y) + "px";
					}
				}
			}
			this._status.pTo.set(p.x, p.y);
			if (currentObject && currentObject.userData.selected !== true) {
				cad.dom.style.cursor = "default";
				if (currentObject instanceof Line) {
					if (currentObject.material instanceof LineBasicMaterial) {
						currentObject.material.color.set(cad.data.findEntity(currentObject.name)?.color);
					}
				}
				this.currentObject = null;
			}
			const object = this._getInterSection(new Vector2(event.clientX, event.clientY));
			if (object && object.userData.selected !== true) {
				cad.dom.style.cursor = "pointer";
				if (object instanceof Line) {
					if (object.material instanceof LineBasicMaterial) {
						object.material.color.set(cad.config.hoverColor);
					}
				}
				this.currentObject = object;
			}
		});
		["pointerup"].forEach((v) => {
			dom.addEventListener(v, (event: PointerEvent) => {
				const {camera, objects, config} = this.cad;
				const {pFrom, pTo, dragging} = this._status;
				if (dragging) {
					if (this._multiSelector.hidden === false) {
						this._multiSelector.hidden = true;
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
								toSelect.push(object);
							}
						}
						if (toSelect.every((o) => o.userData.selected)) {
							toSelect.forEach((o) => (o.userData.selected = false));
						} else {
							toSelect.forEach((object) => {
								object.userData.selected = true;
								object.material.color.set(config.selectedColor);
							});
						}
					}
				}
				const p = new Vector2(event.clientX, event.clientY);
				const offset = new Vector2(p.x - pTo.x, pTo.y - p.y);
				if (Math.abs(offset.x) < 5 && Math.abs(offset.y) < 5) {
					const object = this._getInterSection(p);
					if (object) {
						if (object.userData.selected === true) {
							if (object instanceof Line) {
								if (object.material instanceof LineBasicMaterial) {
									object.userData.selected = false;
									object.material.color.set(cad.data.findEntity(object.name)?.color);
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
				this._status.dragging = false;
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
			return intersects[0].object;
		}
		return null;
	}
}