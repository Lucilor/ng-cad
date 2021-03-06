import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {Vector2} from "three";
import {CadDataService} from "@services/cad-data.service";
import {CadEntity} from "@src/app/cad-viewer/cad-data/cad-entity/cad-entity";
import {CadLine} from "@src/app/cad-viewer/cad-data/cad-entity/cad-line";
import {CadTransformation} from "@src/app/cad-viewer/cad-data/cad-transformation";
import {CadData, CadOption, CadBaseLine, CadJointPoint} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadDimension} from "@src/app/cad-viewer/cad-data/cad-entity/cad-dimension";
import {environment} from "@src/environments/environment";
import {EventEmitter} from "events";
import {CadMtext} from "@src/app/cad-viewer/cad-data/cad-entity/cad-mtext";
import {generatePointsMap} from "@src/app/cad-viewer/cad-data/cad-lines";

interface Mode {
	type: "normal" | "baseLine" | "dimension" | "jointPoint" | "assemble";
	index: number;
}

interface LinesAtPoint {
	point: Vector2;
	tPoint: Vector2;
	lines: CadEntity[];
	selected: boolean;
}

export class CadMenu extends EventEmitter {
	cad: CadViewer;
	dialog: MatDialog;
	dataService: CadDataService;
	line: CadLine;
	mode: Mode;
	cadIdx = -1;
	cadIdxs2 = Array<number>();
	partner: string;
	cadLength = 0;
	pointsMap: LinesAtPoint[];
	viewMode: "normal" | "partners" | "components" | "slice" | "validation" = "normal";
	drawDimensions = true;
	drawMTexts = true;
	get selectMode() {
		return this.cad.controls.config.selectMode === "single" ? "单选" : "多选";
	}
	get entitiesDraggable() {
		return this.cad.controls.config.entitiesDraggable;
	}
	get showGongshi() {
		return this.cad.config.showGongshi > 0;
	}
	showCadGongshis = false;
	cadGongshis: CadMtext[] = [];
	readonly accuracy = 1;
	readonly selectedColor = 0xffff00;
	readonly hoverColor = 0x00ffff;

	constructor(dialog: MatDialog, cad: CadViewer, dataService: CadDataService) {
		super();
		this.cad = cad;
		this.dialog = dialog;
		this.mode = {type: "normal", index: -1};
		this.dataService = dataService;
	}

	initData() {
		const {cad} = this;
		cad.data.components.data.forEach((d) => this.setData(d));
		cad.render(true);

		const start = new Vector2();
		let button: number;
		cad.controls.on("dragstart", (event) => {
			start.set(event.clientX, event.clientY);
			button = event.button;
		});
		cad.controls.on("drag", (event) => {
			if (this.cadIdx >= 0 && (button === 1 || (event.shiftKey && button === 0))) {
				const scale = cad.scale;
				const end = new Vector2(event.clientX, event.clientY);
				const translate = end.sub(start).divide(new Vector2(scale, -scale));
				const data = this.getData(this.cadIdx, -1);
				if (this.viewMode === "components" && this.cadIdxs2.length) {
					this.cadIdxs2.forEach((i) => {
						data.moveComponent(this.getData(this.cadIdx, i), translate.clone());
					});
				} else {
					data.transform(new CadTransformation({translate}));
				}
				cad.render();
				start.set(event.clientX, event.clientY);
			}
		});
		cad.controls.on("dragend", () => (button = NaN));
		cad.controls.on("wheel", () => this.updatePointsMap());
		cad.controls.on("entitiesdelete", () => {
			this.updateCadLength();
		});
		cad.controls.on("entityselect", (event, entity) => {
			if (!environment.production) {
				console.log(entity);
			}
		});
	}

	addCadGongshi(data: CadData) {
		const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
		const mtext = new CadMtext();
		const {x, y, width, height} = data.getAllEntities().getBounds();
		mtext.text = `${zhankaikuan} x ${zhankaigao} = ${shuliang}`;
		if (Number(shuliangbeishu) > 1) {
			mtext.text += " x " + shuliangbeishu;
		}
		mtext.insert = new Vector2(x - width / 2, y - height / 2 - 10);
		mtext.visible = this.showCadGongshis;
		data.entities.add(mtext);
		this.cadGongshis.push(mtext);
		data.partners.forEach((d) => this.addCadGongshi(d));
		data.components.data.forEach((d) => this.addCadGongshi(d));
	}

	removeCadGongshis(data: CadData) {
		const toRemove = new CadData();
		toRemove.entities.mtext = this.cadGongshis;
		data.separate(toRemove);
	}

	getData(cadIdx = this.cadIdx, cadIdx2 = this.cadIdxs2[0]) {
		const {cad, viewMode} = this;
		let result: CadData;
		if (viewMode === "normal" || viewMode === "validation" || cadIdx2 < 0) {
			result = cad.data.components.data[cadIdx];
		} else if (viewMode === "partners") {
			result = cad.data.components.data[cadIdx].partners[cadIdx2];
		} else if (viewMode === "components") {
			result = cad.data.components.data[cadIdx].components.data[cadIdx2];
		}
		if (!result) {
			result = new CadData();
		}
		return result;
	}

	setData(data: CadData) {
		if (data.options.length < 1) {
			this.addOption(0, data);
		}
		if (data.conditions.length < 1) {
			this.addCondition(0, data);
		}
		if (data.baseLines.length < 1) {
			this.addBaseLine(0, data);
		}
		if (data.jointPoints.length < 1) {
			this.addJointPoint(0, data);
		}
		const {zhankaikuan, zhankaigao, shuliang, shuliangbeishu} = data;
		if (zhankaikuan && zhankaigao && shuliang) {
			const mtext = new CadMtext();
			const {x, y, width, height} = data.getAllEntities().getBounds();
			mtext.text = `${zhankaikuan} × ${zhankaigao} = ${shuliang}`;
			if (Number(shuliangbeishu) > 1) {
				mtext.text += " × " + shuliangbeishu;
			}
			mtext.insert = new Vector2(x - width / 2, y - height / 2 - 10);
			mtext.visible = this.showCadGongshis;
			data.entities.add(mtext);
			this.cadGongshis.push(mtext);
		}
		data.partners.forEach((v) => this.setData(v));
		data.components.data.forEach((v) => this.setData(v));
	}

	async submit(all = false) {
		const {cadIdx, dataService, cad} = this;
		const data = all ? cad.data.components.data : [this.getData(cadIdx, -1)];
		data.forEach((v) => this.removeCadGongshis(v));
		const resData = await dataService.postCadData(data);
		if (all) {
			cad.data.components.data = resData;
		} else {
			cad.data.components.data[cadIdx] = resData[0];
		}
		this.setData(this.getData(cadIdx, -1));
		cad.reset();
		this.focus();
		this.emit("aftersubmit");
	}

	addOption(i: number, data = this.getData()) {
		data.options.splice(i + 1, 0, new CadOption());
	}
	async removeOption(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.options;
			if (arr.length === 1) {
				arr[0] = new CadOption();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addCondition(i: number, data = this.getData()) {
		data.conditions.splice(i + 1, 0, "");
	}
	async removeCondition(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.conditions;
			if (arr.length === 1) {
				arr[0] = "";
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addBaseLine(i: number, data = this.getData()) {
		data.baseLines.splice(i + 1, 0, new CadBaseLine());
	}
	async removeBaseLine(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.baseLines;
			if (arr.length === 1) {
				arr[0] = new CadBaseLine();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addJointPoint(i: number, data = this.getData()) {
		data.jointPoints.splice(i + 1, 0, new CadJointPoint());
	}
	async removeJointPoint(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.jointPoints;
			if (arr.length === 1) {
				arr[0] = new CadJointPoint();
			} else {
				arr.splice(i, 1);
			}
		}
	}

	addDimension(i: number, data = this.getData()) {
		data.entities.dimension.splice(i + 1, 0, new CadDimension());
	}
	async removeDimension(i: number, data = this.getData()) {
		if ((await this._beforeRemove()) === true) {
			const arr = data.entities.dimension;
			if (arr.length === 1) {
				arr[0] = new CadDimension();
			} else {
				arr.splice(i, 1);
			}
			this.cad.render();
		}
	}

	selectLineBegin(type: Mode["type"], index: number) {
		const {cad, mode} = this;
		cad.traverse((o) => (o.userData.selected = false));
		mode.type = type;
		mode.index = index;
		cad.render();
	}

	selectLineEnd() {
		const {cad, mode} = this;
		cad.traverse((o) => (o.userData.selected = false));
		this.focus();
		cad.render();
		mode.type = "normal";
	}

	updatePointsMap() {
		this.pointsMap = generatePointsMap(this.getData().getAllEntities(), this.cad);
	}

	focus(cadIdx = this.cadIdx, cadIdxs2 = this.cadIdxs2, viewMode: CadMenu["viewMode"] = this.viewMode) {
		this.cadIdx = cadIdx;
		this.cadIdxs2 = cadIdxs2;
		const viewModeChanged = this.viewMode !== viewMode;
		this.viewMode = viewMode;
		const {cad} = this;
		if (cadIdxs2.length > 0) {
			cad.data.components.data.forEach((d, i) => {
				if (cadIdx === i || viewMode === "normal") {
					d.show();
				} else {
					d.hide();
				}
			});
		}
		if (viewMode === "normal" || viewMode === "validation") {
			const data = this.getData();
			cad.data.components.data.forEach((d) => {
				const opacity = d.id === data.id ? 1 : 0.3;
				const selectable = d.id === data.id ? true : false;
				cad.traverse((o, e) => {
					o.userData.selectable = selectable;
					e.opacity = opacity;
				}, d.getAllEntities());
			});
			this.cadIdxs2 = [];
		} else {
			const data = this.getData(this.cadIdx, -1);
			if (cadIdxs2.length > 0) {
				let subData: CadData[];
				if (viewMode === "partners") {
					subData = data.partners;
					data.components.data.forEach((d) => {
						d.getAllEntities().forEach((e) => (e.visible = false));
					});
				}
				if (viewMode === "components") {
					subData = data.components.data;
					data.partners.forEach((d) => {
						d.getAllEntities().forEach((e) => (e.visible = false));
					});
				}
				cad.traverse((o, e) => {
					o.userData.selectable = false;
					e.opacity = 0.3;
				}, data.entities);
				subData.forEach((d, i) => {
					const isFocused = cadIdxs2.includes(i);
					const opacity = isFocused ? 1 : 0.3;
					const selectable = isFocused ? true : false;
					cad.traverse((o, e) => {
						o.userData.selectable = selectable;
						e.opacity = opacity;
					}, d.getAllEntities());
				});
			} else {
				cad.traverse((o, e) => {
					o.userData.selectable = true;
					e.opacity = 1;
				}, data.getAllEntities());
			}
		}
		cad.controls.config.dragAxis = "";
		this.updateCadLength();
		const {mtext, dimension} = cad.data.getAllEntities();
		mtext.forEach((e) => (e.visible = this.drawMTexts));
		dimension.forEach((e) => (e.visible = this.drawMTexts));
		if (viewModeChanged) {
			this.selectLineEnd();
			if (viewMode === "validation") {
				cad.config.validateLines = true;
			} else {
				cad.config.validateLines = false;
			}
		}
		if (this.viewMode === "components") {
			this.showCadGongshis = true;
		}
		this.cadGongshis.forEach((e) => (e.visible = this.showCadGongshis));
		cad.render();
	}

	blur(cadIdx = -1, cadIdxs2 = []) {
		if (this.cadIdxs2.length > 0) {
			this.cadIdxs2 = cadIdxs2;
		} else if (this.cadIdx >= 0) {
			this.cadIdx = cadIdx;
		}
		this.cad
			.traverse((o, e) => {
				o.userData.selectable = true;
				e.opacity = 1;
			})
			.render();
		this.cad.controls.config.dragAxis = "xy";
	}

	updateCadLength() {
		const data = this.getData();
		if (data) {
			this.cadLength = 0;
			const entities = data.getAllEntities();
			entities.line.forEach((e) => (this.cadLength += e.length));
			entities.arc.forEach((e) => (this.cadLength += e.curve.getLength()));
			entities.circle.forEach((e) => (this.cadLength += e.curve.getLength()));
			this.cadLength = Number(this.cadLength.toFixed(2));
		}
	}

	toggleDimensions() {
		this.drawDimensions = !this.drawDimensions;
		this.cad.data.getAllEntities().dimension.forEach((e) => (e.visible = this.drawDimensions));
		this.cad.render();
	}

	toggleMtexts() {
		this.drawMTexts = !this.drawMTexts;
		this.cad.data.getAllEntities().mtext.forEach((e) => (e.visible = this.drawMTexts));
		this.cad.render();
	}

	toggleSelectMode() {
		const config = this.cad.controls.config;
		config.selectMode = config.selectMode === "single" ? "multiple" : "single";
	}

	toggleEntitiesDraggable() {
		this.cad.controls.config.entitiesDraggable = !this.entitiesDraggable;
	}

	toggleShowGongshi() {
		this.cad.config.showGongshi = this.showGongshi ? 0 : 8;
		this.cad.render();
	}

	toggleShowCadGongshi() {
		this.showCadGongshis = !this.showCadGongshis;
		this.cadGongshis.forEach((e) => (e.visible = this.showCadGongshis));
		this.cad.render();
	}

	updateCadGongshi() {
		const {cadGongshis, cad} = this;
		cadGongshis.forEach((v) => cad.removeEntity(v));
		cadGongshis.length = 0;
		cad.data.components.data.forEach((v) => this.setData(v));
		cad.render();
	}

	private _beforeRemove() {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		return new Promise((r) => {
			ref.afterClosed().subscribe((res) => {
				r(res);
			});
		});
	}
}
