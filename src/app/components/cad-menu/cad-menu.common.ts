import {CadData, CadLine, cadTypes, CadEntity} from "@app/cad-viewer/cad-data";
import {AlertComponent} from "../alert/alert.component";
import {cloneDeep} from "lodash";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {Line, LineBasicMaterial, Material, Mesh, Vector2} from "three";
import {Angle, Arc, Point} from "@lucilor/utils";

interface Mode {
	type: "normal" | "baseLine" | "dimension" | "jointPoint";
	index: number;
}

interface LinesAtPoint {
	point: Point;
	tPoint: Point;
	lines: CadEntity[];
	selected: boolean;
}

export class CadMenu {
	cad: CadViewer;
	cadsData?: CadData[];
	dialog: MatDialog;
	entity: CadLine;
	mode: Mode;
	line: number;
	dimension: string;
	cadIdx = 0;
	partner: string;
	private initVals = {
		options: {name: "", value: ""},
		conditions: "",
		baseLines: {name: "", idX: "", idY: ""},
		jointPoints: {name: "", valueX: null, valueY: null},
		dimensions: {
			axis: "x",
			color: 7,
			type: "DIMENSION",
			entity1: {id: "", location: "start"},
			entity2: {id: "", location: "end"},
			distance: 16,
			font_size: 16,
			dimstyle: ""
		}
	};
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	readonly accuracy = 0.01;
	pointsMap: LinesAtPoint[];

	constructor(dialog: MatDialog, cad: CadViewer, cadsData?: CadData[]) {
		this.cad = cad;
		this.dialog = dialog;
		this.mode = {type: "normal", index: 0};
	}

	getVIdx(field: string) {
		let index = 0;
		if (field === "dimensions") {
			for (let i = 0; i < this.cadIdx; i++) {
				index += this.cadsData[i].entities.dimension.length;
			}
			// index += Math.max(0, this.mode.index);
		} else {
			for (let i = 0; i < this.cadIdx; i++) {
				index += this.cadsData[i][field].length;
			}
			// index += Math.max(0, this.mode.index);
		}
		return index;
	}

	addItem(i: number, field: string, cadIdx: number) {
		const initVal = cloneDeep(this.initVals[field]);
		let arr1: any;
		let arr2: any;
		if (field === "dimensions") {
			arr1 = this.cad.data.entities.dimension;
			arr2 = this.cadsData?.[cadIdx].entities.dimension;
		} else {
			arr1 = this.cad.data[field];
			arr2 = this.cadsData?.[cadIdx][field];
		}
		arr1.splice(i + 1, 0, initVal);
		if (arr2) {
			arr2.splice(this.getVIdx(field) + 1, 0, initVal);
		}
	}

	removeItem(i: number, field: string) {
		const ref = this.dialog.open(AlertComponent, {data: {content: "是否确定删除？", confirm: true}});
		let arr1: any;
		let arr2: any;
		if (field === "dimensions") {
			arr1 = this.cad.data.entities.dimension;
			arr2 = this.cadsData?.[this.cadIdx].entities.dimension;
		} else {
			arr1 = this.cad.data[field];
			arr2 = this.cadsData?.[this.cadIdx][field];
		}
		ref.afterClosed().subscribe((res) => {
			if (res === true) {
				const initVal = JSON.parse(JSON.stringify(this.initVals[field]));
				if (arr1.length === 1) {
					arr1[0] = initVal;
					if (arr2) {
						arr2[this.getVIdx(field)] = initVal;
					}
				} else {
					arr1.splice(i, 1);
					if (arr2) {
						arr2.splice(this.getVIdx(field), 1);
					}
				}
			}
		});
	}

	selectLineBegin(type: Mode["type"], index: number) {
		const cad = this.cad;
		const entities = this.cad.data.entities;
		const ids = entities.line.map((e) => e.id);
		entities.line.forEach((e) => {
			const object = cad.objects[e.id] as Line;
			if (object) {
				const material = object.material as Material;
				const slope = e.start[1] / e.end[1] / (e.start[0] / e.end[0]);
				const flag = type.includes("dimension") ? true : slope === 0 || !isFinite(slope);
				if ((type.includes("dimension") || ids.includes(e.id)) && flag) {
					material.opacity = 1;
					object.userData.selectable = true;
				} else {
					material.opacity = 0.3;
					object.userData.selectable = false;
				}
			}
		});
		Object.values(cadTypes).forEach((type) => {
			if (type === "line") {
				return;
			}
			(entities[type] as CadEntity[]).forEach((e) => {
				const object = cad.objects[e.id] as Mesh;
				if (object) {
					const material = object.material as Material;
					material.opacity = 0.3;
					object.userData.selectable = false;
				}
			});
		});
		this.mode.type = type;
		this.mode.index = index;
		cad.config.selectedColor = 0x0000ff;
		cad.config.hoverColor = 0x00ffff;
		cad.render();
	}

	selectLineEnd() {
		const {cad} = this;
		const entities = this.cad.data.entities;
		Object.values(cadTypes).forEach((type) => {
			(entities[type] as CadEntity[]).forEach((e) => {
				const object = cad.objects[e.id] as Mesh;
				if (object) {
					const material = object.material as Material;
					material.opacity = 0.3;
					object.userData.selectable = true;
					object.userData.selected = false;
				}
			});
		});
		cad.config.selectedColor = null;
		cad.config.hoverColor = null;
		cad.render();
		this.mode.type = "normal";
	}

	selectBaseline(i: number, cadIdx: number) {
		const {mode, cad} = this;
		if (mode.type === "baseLine" && mode.index === i) {
			this.selectLineEnd();
		} else {
			const {idX, idY} = cad.data.baseLines[this.getVIdx("baseLines")];
			Object.values(cadTypes).forEach((type) => {
				(cad.data.entities[type] as CadEntity[]).forEach((e) => {
					const object = cad.objects[e.id] as Mesh;
					if (object) {
						object.userData.selected = [idX, idY].includes(e.id);
					}
				});
			});
			this.selectLineBegin("baseLine", i);
		}
	}

	selectJointPoint(i: number) {
		const {mode} = this;
		if (mode.type === "jointPoint" && mode.index === i) {
			this.selectLineEnd();
		} else {
			mode.type = "jointPoint";
			mode.index = i;
			this.generatePointsMap();
		}
	}

	onJointPointClick(i: number) {
		const {pointsMap, cad, cadsData, mode} = this;
		pointsMap.forEach((v, j) => (v.selected = i === j));
		const index = mode.index;
		const vIdx = this.getVIdx("jointPoints");
		const point = pointsMap[i].point;
		const jointPoint = cad.data.jointPoints[index];
		jointPoint.valueX = point.x;
		jointPoint.valueY = point.y;
		// const vJointPoint = vCad.data.jointPoints[vIdx + index];
		// vJointPoint.valueX = point.x;
		// vJointPoint.valueY = point.y;
	}

	private generatePointsMap() {
		const {cad, accuracy, cadsData} = this;
		if (!this.cad) {
			this.pointsMap = [];
			return;
		}
		const pointsMap: LinesAtPoint[] = [];
		const addToMap = (point: Point, line: CadEntity) => {
			const linesAtPoint = pointsMap.find((v) => v.point.equalsAppr(point, accuracy));
			if (linesAtPoint) {
				linesAtPoint.lines.push(line);
			} else {
				pointsMap.push({point, lines: [line], tPoint: new Point(), selected: false});
			}
		};
		const vIdx = this.getVIdx("entities");
		// const entities = vCad.flatEntities().slice(vIdx, vIdx + cad.flatEntities().length);
		cad.data.entities.line.forEach((entity) => {
			const start = new Point(entity.start);
			const end = new Point(entity.end);
			if (start.distance(end) > 0) {
				addToMap(start, entity);
				addToMap(end, entity);
			}
		});
		cad.data.entities.arc.forEach((entity) => {
			const start = new Angle(entity.start_angle, "deg");
			const end = new Angle(entity.end_angle, "deg");
			const arc = new Arc(new Point(entity.center), entity.radius, start, end, entity.clockwise);
			if (arc.length > 0) {
				addToMap(arc.startPoint, entity);
				addToMap(arc.endPoint, entity);
			}
		});
		this.pointsMap = pointsMap;
	}
}
