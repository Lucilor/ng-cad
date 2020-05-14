import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../../alert/alert.component";
import {CadData, CadConnection} from "@src/app/cad-viewer/cad-data";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";

@Component({
	selector: "app-cad-assemble",
	templateUrl: "./cad-assemble.component.html",
	styleUrls: ["./cad-assemble.component.scss"]
})
export class CadAssembleComponent implements OnInit {
	@Input() menu: CadMenu;
	get data() {
		return this.menu.getData(this.menu.cadIdx, -1);
	}
	options = {space: "0", position: "absolute"};
	assembling = false;
	ids: string[] = [];
	names: string[] = [];
	lines: string[] = [];
	constructor(private dialog: MatDialog) {}

	ngOnInit() {
		const cad = this.menu.cad;
		cad.controls.on("entityselect", (event, entity, object) => {
			if (this.assembling) {
				const data = this.data;
				const fakeComponent = new CadData({id: data.id, name: data.name});
				fakeComponent.entities = data.entities;
				for (const component of [...data.components.data, fakeComponent]) {
					const {ids, lines, names} = this;
					const found = component.findEntity(entity.id);
					if (found) {
						const prev = ids.findIndex((id) => id === component.id);
						const {space, position} = this.options;
						if (object.userData.selected) {
							if (position === "absolute") {
								if (prev > -1) {
									lines[prev] = found.id;
								} else {
									ids.push(component.id);
									names.push(component.name);
									lines.push(found.id);
								}
							}
							if (position === "relative") {
								if (prev > -1) {
									if (prev === 0) {
										lines.push(found.id);
										if (lines.length > 2) {
											lines.shift();
										}
									} else {
										lines[prev] = found.id;
									}
								} else {
									ids.push(component.id);
									names.push(component.name);
									lines.push(found.id);
								}
								lines.forEach((l) => (cad.objects[l].userData.selected = true));
							}
							if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
								try {
									console.log(ids, names, lines);
									data.assembleComponents(new CadConnection({ids, names, lines, space, position}));
								} catch (error) {
									this.dialog.open(AlertComponent, {data: {content: error.message}});
								} finally {
									ids.length = 0;
									lines.length = 0;
									cad.unselectAll();
								}
							}
						} else if (prev > -1) {
							if (position === "relative") {
								if (prev === 0) {
									const idx = lines.findIndex((l) => l === found.id);
									lines.splice(idx, -1);
									if (lines.length < 1) {
										ids.splice(prev, 1);
									}
								} else {
									ids.splice(prev, 1);
									lines.splice(prev + 1, 1);
								}
							} else {
								ids.splice(prev, 1);
								lines.splice(prev, 1);
							}
						}
						cad.render();
						break;
					}
				}
			}
		});
	}

	toggleAssemble() {
		const {data, menu} = this;
		const {cad} = menu;
		this.assembling = !this.assembling;
		this.ids = [];
		this.names = [];
		this.lines = [];
		menu.cad.unselectAll();
		if (this.assembling) {
			menu.blur(menu.cadIdx, menu.cadIdx2);
			menu.selectLineBegin("assemble", -1);
			cad.controls.config.dragAxis = "";
		} else {
			cad.traverse((o) => {
				o.userData.selected = false;
			}, data.getAllEntities());
			menu.focus();
		}
	}

	removeConnection(index: number) {
		this.data.components.connections.splice(index, 1);
	}

	private _findLines(entities: CadEntities): {[key: string]: CadLine} {
		let hLine: CadLine;
		let vLine: CadLine;
		for (const l of entities.line) {
			if (Math.abs(l.slope) <= this.menu.accuracy) {
				hLine = l;
			}
			if (!isFinite(l.slope)) {
				vLine = l;
			}
			if (hLine && vLine) {
				break;
			}
		}
		if (!hLine || !vLine) {
			this.dialog.open(AlertComponent, {data: {content: "缺少水平或垂直的线"}});
			return null;
		}
		return {x: vLine, y: hLine};
	}

	directAssemble() {
		const {menu} = this;
		const data = menu.getData(menu.cadIdx, -1);
		const lines = this._findLines(data.entities);
		if (!lines) {
			return;
		}
		menu.checkedIdx.forEach((i) => {
			const component = menu.getData(menu.cadIdx, i);
			const cLines = this._findLines(component.getAllEntities());
			if (!cLines) {
				return;
			}
			["x", "y"].forEach((axis) => {
				const conn = new CadConnection({axis, position: "absolute"});
				conn.ids = [data.id, component.id];
				conn.names = [data.name, component.name];
				conn.lines = [lines[axis].id, cLines[axis].id];
				if (axis === "x") {
					conn.space = (cLines[axis].start.x - lines[axis].start.x).toString();
				}
				if (axis === "y") {
					conn.space = (cLines[axis].start.y - lines[axis].start.y).toString();
				}
				console.log(conn);
				data.assembleComponents(conn);
			});
		});
		data.updateComponents();
		menu.cad.render();
	}
}
