import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {CadDimensionFormComponent} from "../cad-dimension-form/cad-dimension-form.component";
import {Mesh, Material} from "three";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";

@Component({
	selector: "app-cad-dimension",
	templateUrl: "./cad-dimension.component.html",
	styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent implements OnInit {
	@Input() menu: CadMenu;
	dimNameFocus = -1;
	get data() {
		return this.menu.getData();
	}
	constructor(private dialog: MatDialog) {}

	ngOnInit() {
		const {cad, mode} = this.menu;
		cad.controls.on("entityselect", (event, entity) => {
			const {type, index} = mode;
			const data = this.data;
			if (type === "dimension") {
				const dimension = data.entities.dimension[index];
				let thatData: CadData;
				for (const d of cad.data.components.data) {
					if (d.findEntity(entity.id)) {
						thatData = d;
						break;
					}
				}
				if (!dimension.entity1) {
					dimension.entity1 = {id: entity.id, location: "start"};
					dimension.cad1 = thatData.name;
				} else if (!dimension.entity2) {
					dimension.entity2 = {id: entity.id, location: "end"};
					dimension.cad2 = thatData.name;
				} else {
					dimension.entity1 = dimension.entity2;
					dimension.entity2 = {id: entity.id, location: "end"};
					dimension.cad2 = thatData.name;
				}
				cad.render();
			}
		});
	}

	editDimension(i: number) {
		const {menu, data} = this;
		const cad = menu.cad;
		const ref: MatDialogRef<CadDimensionFormComponent, CadDimension> = this.dialog.open(CadDimensionFormComponent, {
			data: {data: data.entities.dimension[i]},
			disableClose: true
		});
		ref.afterClosed().subscribe((dimension) => {
			if (dimension) {
				data.entities.dimension[i] = dimension;
				cad.render();
			}
		});
	}

	getDimensionName(dimension: CadDimension, index: number) {
		if (this.dimNameFocus === index) {
			return dimension.mingzi || "";
		} else {
			return `${dimension.mingzi || ""} ${dimension.qujian || ""}`;
		}
	}

	setDimensionName(event: InputEvent, dimension: CadDimension) {
		const str = (event.target as HTMLInputElement).value;
		dimension.mingzi = str;
		this.menu.cad.render();
	}

	selectDimLine(i: number) {
		const {menu, data} = this;
		const cad = menu.cad;
		if (menu.mode.type === "dimension" && menu.mode.index === i) {
			menu.selectLineEnd();
		} else {
			const {entity1, entity2} = data.entities.dimension[i];
			cad.traverse((o, e) => {
				const material = (o as Mesh).material as Material;
				if (e instanceof CadLine) {
					o.userData.selectable = true;
					o.userData.selected = [entity1.id, entity2.id].includes(e.id);
					material.setValues({opacity: 1});
				} else if (e instanceof CadDimension) {
					o.userData.selectable = false;
					material.setValues({opacity: 1});
				} else {
					o.userData.selectable = false;
					material.setValues({opacity: 0.3, transparent: true});
				}
			});
			menu.selectLineBegin("dimension", i);
		}
	}
}
