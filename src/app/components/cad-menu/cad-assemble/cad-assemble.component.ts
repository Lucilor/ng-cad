import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../../alert/alert.component";

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
	names: string[] = [];
	lines: string[] = [];
	constructor(private dialog: MatDialog) {}

	ngOnInit() {
		const cad = this.menu.cad;
		cad.controls.on("entityselect", (event, entity, object) => {
			if (this.assembling) {
				const data = this.data;
				for (const component of data.components.data) {
					const {names, lines} = this;
					const found = component.findEntity(entity.id);
					if (found) {
						const prev = names.findIndex((n) => n === component.name);
						const {space, position} = this.options;
						if (object.userData.selected) {
							if (position === "absolute") {
								if (prev > -1) {
									lines[prev] = found.id;
								} else {
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
									names.push(component.name);
									lines.push(found.id);
								}
								lines.forEach((l) => (cad.objects[l].userData.selected = true));
							}
							if ((lines.length === 2 && position === "absolute") || (lines.length === 3 && position === "relative")) {
								cad.objects[found.id].userData.selected = false;
								try {
									data.assembleComponents({names, lines, space, position});
								} catch (error) {
									this.dialog.open(AlertComponent, {data: {content: error.message}});
								} finally {
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
										names.splice(prev, 1);
									}
								} else {
									names.splice(prev, 1);
									lines.splice(prev + 1, 1);
								}
							} else {
								names.splice(prev, 1);
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
		if (this.assembling) {
			menu.blur(menu.cadIdx, menu.cadIdx2);
			menu.selectLineBegin("assemble", -1);
		} else {
			cad.traverse((o) => {
				o.userData.selected = false;
			}, data.getAllEntities());
			this.names = [];
			this.lines = [];
			menu.focus();
		}
	}

	removeConnection(index: number) {
		this.data.components.connections.splice(index, 1);
	}
}
