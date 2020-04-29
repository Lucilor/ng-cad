import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {MatDialogRef, MatDialog} from "@angular/material/dialog";
import {CadDimensionFormComponent} from "../cad-dimension-form/cad-dimension-form.component";
import {CadDimension, CadLine} from "@app/cad-viewer/cad-data";
import {Line} from "three";

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
		cad.controls.on("entityselect", (event, entity, object) => {
			const {type, index} = mode;
			const data = this.menu.getData();
			if (type === "dimension") {
				if (entity instanceof CadLine && object instanceof Line) {
					const slope = entity.slope;
					const baseLine = data.baseLines[index];
					if (slope === 0) {
						baseLine.idY = object.userData.selected ? entity.id : null;
					}
					if (!isFinite(slope)) {
						baseLine.idX = object.userData.selected ? entity.id : null;
					}
					data.updateBaseLines();
					data.entities.forEach((e) => {
						const object = cad.objects[e.id];
						if (object) {
							object.userData.selected = [baseLine.idX, baseLine.idY].includes(e.id);
						}
					});
					cad.render();
				}
			}
		});
	}

	editDimension(i: number) {
		const {menu, data} = this;
		const cad = menu.cad;
		menu.dimension = data.entities.dimension[i].id;
		const ref: MatDialogRef<CadDimensionFormComponent, CadDimension> = this.dialog.open(CadDimensionFormComponent, {
			data: {data, index: i},
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
			data.entities.forEach((e) => {
				const object = cad.objects[e.id];
				if (object) {
					object.userData.selected = [entity1.id, entity2.id].includes(e.id);
				}
			});
			menu.selectLineBegin("dimension", i);
		}
	}
}
