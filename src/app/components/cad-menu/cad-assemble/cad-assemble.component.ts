import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../../alert/alert.component";
import {CadData, CadConnection} from "@src/app/cad-viewer/cad-data/cad-data";

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
		const menu = this.menu;
		const cad = menu.cad;
		cad.controls.on("entityselect", (event, entity, object) => {
			if (this.assembling) {
				const data = this.data;
				const dumpComponent = new CadData({id: data.id, name: data.name});
				dumpComponent.entities = data.entities;
				for (const component of [...data.components.data, dumpComponent]) {
					const {ids, lines, names} = this;
					const found = component.findEntity(entity.id);
					if (found) {
						const prev = ids.findIndex((id) => id === component.id || id === component.originalId);
						const {space, position} = this.options;
						if (object.userData.selected) {
							if (position === "absolute") {
								if (prev > -1) {
									lines[prev] = found.originalId;
								} else {
									ids.push(component.originalId);
									names.push(component.name);
									lines.push(found.originalId);
								}
							}
							if (position === "relative") {
								if (prev > -1) {
									if (prev === 0) {
										lines.push(found.originalId);
										if (lines.length > 2) {
											lines.shift();
										}
									} else {
										lines[prev] = found.originalId;
									}
								} else {
									ids.push(component.originalId);
									names.push(component.name);
									lines.push(found.originalId);
								}
								lines.forEach((l) => (cad.objects[l].userData.selected = true));
							}
							if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
								try {
									data.assembleComponents(new CadConnection({ids, names, lines, space, position}));
								} catch (error) {
									this.dialog.open(AlertComponent, {data: {content: error.message}});
								} finally {
									ids.length = 0;
									names.length = 0;
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
			menu.blur(menu.cadIdx, menu.cadIdxs2);
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

	directAssemble() {
		const {menu} = this;
		const data = menu.getData(menu.cadIdx, -1);
		menu.cadIdxs2.forEach((i) => {
			const component = menu.getData(menu.cadIdx, i);
			try {
				data.directAssemble(component);
			} catch (error) {
				this.dialog.open(AlertComponent, {data: {content: error}});
			}
		});
		menu.cad.render();
	}

	clearConnections() {
		const {menu} = this;
		const data = menu.getData(menu.cadIdx, -1);
		data.components.connections.length = 0;
	}
}
