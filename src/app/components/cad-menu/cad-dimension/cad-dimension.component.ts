import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {CadDimensionFormComponent} from "../cad-dimension-form/cad-dimension-form.component";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadEntities} from "@src/app/cad-viewer/cad-data/cad-entities";

@Component({
	selector: "app-cad-dimension",
	templateUrl: "./cad-dimension.component.html",
	styleUrls: ["./cad-dimension.component.scss"]
})
export class CadDimensionComponent implements OnInit {
	@Input() menu: CadMenu;
	dimNameFocus = -1;
	get data() {
		return this.menu.cad.data.getAllEntities().dimension;
	}
	tempDimension: CadDimension[] = [];
	constructor(private dialog: MatDialog) {}

	ngOnInit() {
		const {cad, mode} = this.menu;
		cad.controls.on("entityselect", (event, entity) => {
			const {type, index} = mode;
			const dimensions = this.data;
			if (type === "dimension" && entity instanceof CadLine) {
				let thatData: CadData;
				for (const d of cad.data.components.data) {
					if (d.findEntity(entity.id)) {
						thatData = d;
						break;
					}
				}
				let dimension = dimensions[index];
				if (!dimension) {
					dimension = new CadDimension();
					mode.index = thatData.entities.dimension.push(dimension) - 1;
				}
				if (!dimension.entity1.id) {
					dimension.entity1 = {id: entity.id, location: "start"};
					dimension.cad1 = thatData.name;
				} else if (!dimension.entity2.id) {
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
			data: {data: data[i]},
			disableClose: true
		});
		ref.afterClosed().subscribe((dimension) => {
			if (dimension) {
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
			const {entity1, entity2} = data[i] || {};
			cad.traverse((o, e) => {
				if (e instanceof CadLine) {
					o.userData.selectable = true;
					o.userData.selected = [entity1?.id, entity2?.id].includes(e.id);
					e.opacity = 1;
				} else if (e instanceof CadDimension) {
					o.userData.selectable = false;
					e.opacity = 1;
				} else {
					o.userData.selectable = false;
					e.opacity = 0.3;
				}
			});
			menu.selectLineBegin("dimension", i);
		}
	}

	addDimension() {
		this.selectDimLine(-1);
	}

	removeDimension(entity: CadDimension) {
		this.menu.cad.removeEntities(new CadEntities().add(entity));
	}
}
