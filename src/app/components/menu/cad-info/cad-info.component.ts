import {Component, OnInit, Input} from "@angular/core";
import {MenuComponent} from "../menu.component";
import {Store} from "@ngrx/store";
import {State} from "@src/app/store/state";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadOptionsComponent} from "../../cad-menu/cad-options/cad-options.component";
import {getCurrCads} from "@src/app/store/selectors";
import {timeout} from "@src/app/app.common";
import {CadDataService} from "@src/app/services/cad-data.service";
import {AlertComponent} from "../../alert/alert.component";
import {CadStatusAction} from "@src/app/store/actions";
import {Mesh, Material} from "three";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {Line} from "@lucilor/utils";

@Component({
	selector: "app-cad-info",
	templateUrl: "./cad-info.component.html",
	styleUrls: ["./cad-info.component.scss"]
})
export class CadInfoComponent extends MenuComponent implements OnInit {
	@Input() cad: CadViewer;
	@Input() currCads: CadData[];
	@Input() cadStatus: State["cadStatus"];
	lengths: string[] = [];
	sampleFormulas: string[] = [];

	constructor(private store: Store<State>, private dialog: MatDialog, private dataService: CadDataService) {
		super();
	}

	ngOnInit() {
		this.store.select(getCurrCads).subscribe(async () => {
			await timeout(0);
			this.updateLengths();
		});
		this.dataService.getSampleFormulas().then((result) => {
			this.sampleFormulas = result;
		});
		this.cad.controls.on("entityselect", (event, entity, object) => {
			const data = this.currCads[0];
			const {name, index, extra} = this.cadStatus;
			if (name === "select line" && extra === "baseLine") {
				if (entity instanceof CadLine) {
					const baseLine = data.baseLines[index];
					if (entity.isHorizonal()) {
						console.log(1);
						baseLine.idY = object.userData.selected ? entity.id : "";
					}
					if (entity.isVertical()) {
						console.log(2);
						baseLine.idX = object.userData.selected ? entity.id : "";
					}
					data.updateBaseLines();
					data.entities.forEach((e) => {
						const object = this.cad.objects[e.id];
						if (object) {
							object.userData.selected = [baseLine.idX, baseLine.idY].includes(e.id);
						}
					});
					this.cad.render();
				}
			}
		});
	}

	updateLengths() {
		this.currCads.forEach((v, i) => {
			let length = 0;
			const entities = v.getAllEntities();
			entities.line.forEach((e) => (length += e.length));
			entities.arc.forEach((e) => (length += e.curve.getLength()));
			entities.circle.forEach((e) => (length += e.curve.getLength()));
			this.lengths[i] = length.toFixed(2);
		});
	}

	selectOptions(option: CadOption | string) {
		const data = this.currCads[0];
		if (option instanceof CadOption) {
			const checkedItems = option.value.split(",");
			const ref: MatDialogRef<CadOptionsComponent, string[]> = this.dialog.open(CadOptionsComponent, {
				data: {data, name: option.name, checkedItems}
			});
			ref.afterClosed().subscribe((v) => {
				if (Array.isArray(v)) {
					option.value = v.join(",");
				}
			});
		} else if (option === "huajian") {
			const checkedItems = data.huajian.split(",");
			const ref: MatDialogRef<CadOptionsComponent, string[]> = this.dialog.open(CadOptionsComponent, {
				data: {data, name: "花件", checkedItems}
			});
			ref.afterClosed().subscribe((v) => {
				if (Array.isArray(v)) {
					data.huajian = v.join(",");
				}
			});
		}
	}

	confirmRemove() {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		return new Promise((r) => {
			ref.afterClosed().subscribe((res) => {
				r(res);
			});
		});
	}

	addCondition(data: CadData, index: number) {
		data.conditions.splice(index + 1, 0, "");
	}

	async removeCondition(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.conditions;
			if (arr.length === 1) {
				arr[0] = "";
			} else {
				arr.splice(index, 1);
			}
		}
	}

	addOption(data: CadData, index: number) {
		data.options.splice(index + 1, 0, new CadOption());
	}

	async removeOption(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.options;
			if (arr.length === 1) {
				arr[0] = new CadOption();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	addBaseLine(data: CadData, index: number) {
		data.baseLines.splice(index + 1, 0, new CadBaseLine());
	}

	async removeBaseLine(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.baseLines;
			if (arr.length === 1) {
				arr[0] = new CadBaseLine();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	selectBaseLine(data: CadData, index: number) {
		if (this.getItemColor("baseLine", index) === "primary") {
			const {idX, idY} = data.baseLines[index];
			if (this.cad.objects[idX]) {
				this.cad.objects[idX].userData.selected = true;
			}
			if (this.cad.objects[idY]) {
				this.cad.objects[idY].userData.selected = true;
			}
			this.store.dispatch<CadStatusAction>({type: "set cad status", cadStatus: {name: "select line", index, extra: "baseLine"}});
		} else {
			this.store.dispatch<CadStatusAction>({type: "set cad status", cadStatus: {name: "normal", index}});
		}
	}

	addJointPoint(data: CadData, index: number) {
		data.jointPoints.splice(index + 1, 0, new CadJointPoint());
	}

	async removeJointPoint(data: CadData, index: number) {
		if (await this.confirmRemove()) {
			const arr = data.jointPoints;
			if (arr.length === 1) {
				arr[0] = new CadJointPoint();
			} else {
				arr.splice(index, 1);
			}
		}
	}

	getItemColor(field: string, index: number) {
		if (this.cadStatus.extra === field && this.cadStatus.index === index) {
			return "accent";
		}
		return "primary";
	}

	saveStatus() {}

	loadStatus() {}
}
