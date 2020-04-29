import {Component, OnInit, Input} from "@angular/core";
import {CadMenu} from "../cad-menu.common";
import {CadEntity, CadLine} from "@app/cad-viewer/cad-data";
import {Mesh, Line, Material} from "three";
import {MatDialog} from "@angular/material/dialog";
import {ListCadComponent} from "../../list-cad/list-cad.component";
import {CadDataService} from "@services/cad-data.service";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent implements OnInit {
	@Input() menu: CadMenu;
	get data() {
		return this.menu.getData();
	}
	constructor(private dialog: MatDialog, private dataService: CadDataService) {}

	ngOnInit() {
		const {cad, mode} = this.menu;
		cad.controls.on("entityselect", (event, entity, object) => {
			const {type, index} = mode;
			const data = this.menu.getData();
			if (type === "baseLine") {
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

	replaceData() {
		const ref = this.dialog.open(ListCadComponent, {data: {selectMode: "single"}, width: "80vw"});
		ref.afterClosed().subscribe((data) => {
			if (data) {
				this.dataService.replaceData(this.menu.getData(), data.id);
			}
		});
	}

	selectBaseline(i: number) {
		const menu = this.menu;
		const {mode, cad} = menu;
		if (mode.type === "baseLine" && mode.index === i) {
			menu.selectLineEnd();
		} else {
			const {idX, idY} = menu.getData().baseLines[i];
			cad.traverse((o, e) => {
				o.userData.selected = [idX, idY].includes(e.id);
				const material = (o as Mesh).material as Material;
				if (e instanceof CadLine) {
					const slope = (e.start[1] - e.end[1]) / (e.start[0] - e.end[0]);
					if (slope === 0 || !isFinite(slope)) {
						material.setValues({opacity: 1});
						o.userData.selectable = true;
					} else {
						material.setValues({opacity: 0.3, transparent: true});
						o.userData.selectable = false;
					}
				} else {
					material.setValues({opacity: 0.3, transparent: true});
					o.userData.selectable = false;
				}
			});
			menu.selectLineBegin("baseLine", i);
		}
	}

	selectJointPoint(i: number) {
		const menu = this.menu;
		const {mode} = menu;
		if (mode.type === "jointPoint" && mode.index === i) {
			menu.selectLineEnd();
		} else {
			mode.type = "jointPoint";
			mode.index = i;
			menu.generatePointsMap();
		}
	}

	onJointPointClick(i: number) {
		const menu = this.menu;
		const {pointsMap, mode} = menu;
		pointsMap.forEach((v, j) => (v.selected = i === j));
		const index = mode.index;
		const point = pointsMap[i].point;
		const jointPoint = menu.getData().jointPoints[index];
		jointPoint.valueX = point.x;
		jointPoint.valueY = point.y;
		// const vJointPoint = vCad.data.jointPoints[vIdx + index];
		// vJointPoint.valueX = point.x;
		// vJointPoint.valueY = point.y;
	}
}
