import {Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {CadDataService} from "../cad-data.service";
import {CadData, CadViewer, Events, CadEntity, CadTypes, CadLine, CadArc, Dimension} from "@lucilor/cad-viewer";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {Line, Point, Angle, Arc, getColorLightness, RSAEncrypt} from "@lucilor/utils";
import {MatSelectChange} from "@angular/material/select";
import {DimFormComponent} from "./dim-form.component";
import {cloneDeep} from "lodash";

interface Mode {
	type: "normal" | "baseLine" | "dimension1" | "dimension2" | "jointPoint";
	index: number;
}

interface LinesAtPoint {
	point: Point;
	tPoint: Point;
	lines: CadEntity[];
	selected: boolean;
}

@Component({
	selector: "app-edit-cad",
	templateUrl: "./edit-cad.component.html",
	styleUrls: ["./edit-cad.component.scss"]
})
export class EditCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	vCad: CadViewer;
	cads: CadViewer[];
	get cad() {
		return this.cads[this.status.cadIdx];
	}
	status: {entity: CadLine; mode: Mode; line: Line; dimension: Dimension; cadIdx: number};
	pointsMap: LinesAtPoint[];
	rotateAngle = 0;
	partners: {id: string; name: string; img: string}[];
	readonly selectableColors = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
	readonly accuracy = 0.01;

	private initVals = {
		options: {name: "", value: ""},
		conditions: "",
		baseLines: {name: "", idX: "", idY: ""},
		jointPoints: {name: "", valueX: null, valueY: null},
		dimensions: {
			axis: "x",
			entity1: {id: "", location: "start"},
			entity2: {id: "", location: "end"},
			distance: 16,
			fontSize: 16,
			dimstyle: ""
		}
	};
	constructor(
		private route: ActivatedRoute,
		private dataService: CadDataService,
		private dialog: MatDialog,
		private cd: ChangeDetectorRef
	) {
		this.status = {entity: null, mode: {type: "normal", index: -1}, line: new Line(new Point()), dimension: null, cadIdx: 0};
		this.partners = [];
		this.cads = [];
		// tslint:disable-next-line
		window["view"] = this;
	}

	async ngAfterViewInit() {
		document.title = "编辑CAD";
		let data: CadData[];
		const params = this.route.snapshot.queryParams;
		if (params.data) {
			data = await this.dataService.getCadData(params.encode, params.data);
		} else {
			data = [this.dataService.currentFragment];
		}
		if (!data) {
			this.dialog.open(AlertComponent, {data: {content: "没有cad数据。"}});
			return null;
		}
		const vCad = new CadViewer({}, innerWidth, innerHeight, {
			padding: [40, 380, 40, 150],
			showLineLength: 8,
			selectMode: "single",
			backgroundColor: 0,
			drawDimensions: true,
			drawMTexts: true
		})
			.enableDragging()
			.enableWheeling()
			.enableKeyboard();
		this.vCad = vCad;
		vCad.on(Events.entityclick, (event: PIXI.interaction.InteractionEvent, entity: CadEntity) => {
			const {status, cads, cad} = this;
			status.entity = entity as CadLine;
			const prevCadIdx = status.cadIdx;
			cads.some((v, i) => {
				if (v.findEntity(entity.id, v.data.entities)) {
					status.cadIdx = i;
					return true;
				}
			});
			this.setPoints();
			if (entity.type === CadTypes.Line) {
				const lineEntity = entity as CadLine;
				const line = new Line(new Point(lineEntity.start), new Point(lineEntity.end));
				const index = status.mode.index;
				if (status.mode.type === "baseLine") {
					const vIdx = this.getVIdx("baseLines");
					if (line.slope === 0) {
						cad.data.baseLines[index].idY = entity.selected ? entity.id : null;
						vCad.data.baseLines[vIdx + index].idY = entity.selected ? entity.id : null;
					}
					if (!isFinite(line.slope)) {
						cad.data.baseLines[index].idX = entity.selected ? entity.id : null;
						vCad.data.baseLines[vIdx + index].idX = entity.selected ? entity.id : null;
					}
					cad.calculateBaseLines(index);
					const baseLine = cad.data.baseLines[index];
					vCad.data.entities.forEach(e => (e.selected = [baseLine.idX, baseLine.idY].includes(e.id)));
				}
				if (status.mode.type.includes("dimension")) {
					const currCad = this.cad;
					status.cadIdx = prevCadIdx;
					const vIdx = this.getVIdx("dimensions");
					const prevCad = this.cad;
					const dimension = prevCad.data.dimensions[index];
					if (status.mode.type === "dimension1") {
						dimension.entity1.id = entity.id;
						vCad.data.dimensions[vIdx + index].entity1.id = entity.id;
						dimension.cad1 = currCad.data.name;
					}
					if (status.mode.type === "dimension2") {
						dimension.entity2.id = entity.id;
						vCad.data.dimensions[vIdx + index].entity2.id = entity.id;
						dimension.cad2 = currCad.data.name;
					}
				}
				vCad.render();
			}
		});
		vCad.on(Events.drag, () => {
			this.setPoints();
		});
		vCad.on(Events.wheel, () => {
			this.setPoints();
		});
		this.cd.detectChanges();
		this.cadContainer.nativeElement.append(vCad.view);
		data.forEach(d => this.cads.push(new CadViewer(d)));
		this.refresh();
		this.cd.detectChanges();

		document.addEventListener("keydown", event => {
			if (event.key === "Escape") {
				this.status.entity = null;
			}
		});
	}

	refresh() {
		const {vCad, cads} = this;
		this.status = {...this.status, entity: null, mode: {type: "normal", index: -1}, dimension: null};
		const setData = (d: CadData) => {
			if (d.options.length < 1) {
				this.addItem(0, "options", d);
			}
			if (d.conditions.length < 1) {
				this.addItem(0, "conditions", d);
			}
			if (d.baseLines.length < 1) {
				this.addItem(0, "baseLines", d);
			}
			if (d.jointPoints.length < 1) {
				this.addItem(0, "jointPoints", d);
			}
			if (d.dimensions.length < 1) {
				this.addItem(0, "dimensions", d);
			}
		};
		vCad.reset({});
		cads.forEach(v => {
			setData(v.data);
			const newData = v.exportData();
			setData(newData);
			const rect1 = vCad.getBounds();
			const rect2 = v.getBounds();
			const offset = new Point(rect1.x - rect2.x, rect1.y - rect2.y);
			offset.x += rect1.width + 15;
			offset.y += (rect1.height - rect2.height) / 2;
			vCad.transformEntities(newData.entities, {translate: offset});
			newData.jointPoints.forEach(p => {
				p.valueX += offset.x;
				p.valueY += offset.y;
			});

			vCad.data.entities = vCad.data.entities.concat(newData.entities);
			vCad.data.partners = vCad.data.partners.concat(newData.partners);
			vCad.data.options = vCad.data.options.concat(newData.options);
			vCad.data.conditions = vCad.data.conditions.concat(newData.conditions);
			vCad.data.baseLines = vCad.data.baseLines.concat(newData.baseLines);
			vCad.data.jointPoints = vCad.data.jointPoints.concat(newData.jointPoints);
			vCad.data.dimensions = vCad.data.dimensions.concat(newData.dimensions);
			document.body.append(v.render(true).view);
		});
		this.selectLineEnd();
		document.title = "编辑CAD - " + cads.map(v => v.data.name).join(",");
		this.partners = [];
		if (this.route.snapshot.queryParams.join) {
			document.title += "(关联)";
			const names = vCad.data.jointPoints.map(v => v.name);
			vCad.exportData().partners.forEach(partner => {
				const pViewer = new CadViewer(partner, 300, 150, {padding: 10}).render(true);
				pViewer.data.jointPoints.forEach(p => {
					if (names.includes(p.name)) {
						pViewer.drawPoint(new Point(p.valueX, p.valueY), {color: 0xffffff});
					}
				});
				const img = pViewer.exportImage();
				this.partners.push({id: partner.id, name: partner.name, img: img.src});
			});
			vCad.joinPartners();
		}
		vCad.reassembleComponents().render(true);
	}

	flip(vertical: boolean, horizontal: boolean) {
		this.cad?.flip(vertical, horizontal).render(true);
	}

	rotate(clockwise?: boolean) {
		if (clockwise === true) {
			this.cad?.rotate(-Math.PI / 2);
		} else if (clockwise === false) {
			this.cad?.rotate(Math.PI / 2);
		} else {
			this.cad?.rotate(new Angle(this.rotateAngle, "deg").rad);
		}
		this.cad?.render(true);
	}

	addItem(i: number, field: string, data?: any) {
		const initVal = cloneDeep(this.initVals[field]);
		(data || this.cad.data)[field].splice(i + 1, 0, initVal);
		this.vCad.data[field].splice(this.getVIdx(field) + 1, initVal);
	}

	removeItem(i: number, field: string) {
		const initVal = JSON.parse(JSON.stringify(this.initVals[field]));
		if (this.cad.data[field].length === 1) {
			this.cad.data[field][0] = initVal;
			this.vCad.data[field][this.getVIdx(field)] = initVal;
		} else {
			this.cad.data[field].splice(i, 1);
			this.vCad.data[field].splice(this.getVIdx(field), 1);
		}
	}

	selectBaseline(i: number) {
		const {status, vCad} = this;
		if (status.mode.type === "baseLine" && status.mode.index === i) {
			this.selectLineEnd();
		} else {
			const {idX, idY} = vCad.data.baseLines[this.getVIdx("baseLines")];
			vCad.data.entities.forEach(e => (e.selected = [idX, idY].includes(e.id)));
			this.selectLineBegin("baseLine", i);
		}
	}

	selectJointPoint(i: number) {
		const {status} = this;
		if (status.mode.type === "jointPoint" && status.mode.index === i) {
			this.selectLineEnd();
		} else {
			status.mode.type = "jointPoint";
			status.mode.index = i;
			this.generatePointsMap();
		}
	}

	onJointPointClick(i: number) {
		const {pointsMap, status, cad, vCad} = this;
		pointsMap.forEach((v, j) => (v.selected = i === j));
		const index = status.mode.index;
		const vIdx = this.getVIdx("jointPoints");
		const point = pointsMap[i].point;
		const jointPoint = cad.data.jointPoints[index];
		jointPoint.valueX = point.x;
		jointPoint.valueY = point.y;
		const vJointPoint = vCad.data.jointPoints[vIdx + index];
		vJointPoint.valueX = point.x;
		vJointPoint.valueY = point.y;
	}

	async submit() {
		const data = this.cad.exportData("object");
		const params = this.route.snapshot.queryParams;
		const resData = await this.dataService.postCadData([data], params.encode, params.data);
		this.cad.reset(resData[0]);
		this.refresh();
	}

	async submitAll() {
		const data = this.cads.map(v => v.exportData("object"));
		const params = this.route.snapshot.queryParams;
		const resData = await this.dataService.postCadData(data, params.encode, params.data);
		resData.forEach((d, i) => {
			this.cads[i].reset(d);
		});
		this.refresh();
	}

	selectLineBegin(type: Mode["type"], index: number) {
		const vCad = this.vCad;
		const ids = this.cad.data.entities.map(e => e.id);
		vCad.data.entities.forEach(e => {
			if (e.container) {
				if (e.type === CadTypes.Line) {
					const le = e as CadLine;
					const slope = new Line(new Point(le.start), new Point(le.end)).slope;
					if ((type.includes("dimension") || ids.includes(e.id)) && (slope === 0 || !isFinite(slope))) {
						e.container.alpha = 1;
						e.selectable = true;
					} else {
						e.container.alpha = 0.3;
						e.selectable = false;
					}
				} else {
					e.container.alpha = 0.3;
					e.selectable = false;
				}
			}
		});
		this.status.mode.type = type;
		this.status.mode.index = index;
		vCad.config.selectedColor = 0x0000ff;
		vCad.config.hoverColor = 0x00ffff;
		vCad.render();
	}

	selectLineEnd() {
		const {vCad: cad} = this;
		cad.data.entities.forEach(e => {
			if (e.container) {
				e.container.alpha = 1;
				e.selected = false;
				e.selectable = true;
			}
		});
		cad.config.selectedColor = null;
		cad.config.hoverColor = null;
		cad.render();
		this.status.mode.type = "normal";
		// lineController.show();
	}

	setPoints() {
		const {vCad, status} = this;
		if (!status.entity) {
			return;
		}
		if (status.entity.type === CadTypes.Arc) {
			status.line = new Line(new Point());
		}
		if (status.entity.type === CadTypes.Line) {
			const entity = status.entity as CadLine;
			const start = vCad.translatePoint(new Point(entity.start));
			const end = vCad.translatePoint(new Point(entity.end));
			status.line = new Line(start, end);
		}
	}

	getEntityLength() {
		const {status} = this;
		if (status.entity && status.entity.type === CadTypes.Line) {
			const entity = status.entity as CadLine;
			const line = new Line(new Point(entity.start), new Point(entity.end));
			return line.length;
		}
		return "";
	}

	setEntityLength(event: Event) {
		const {vCad, status, cad} = this;
		if (status.entity && status.entity.type === CadTypes.Line) {
			const entity = status.entity as CadLine;
			const length = Number((event.target as HTMLInputElement).value);
			const line = new Line(new Point(entity.start), new Point(entity.end));
			const d = length - line.length;
			const angle = line.theta;
			const offset = new Point(Math.cos(angle), Math.sin(angle)).multiply(d);
			entity.end[0] += offset.x;
			entity.end[1] += offset.y;
			const e1 = cad.findEntity(entity.id) as CadLine;
			if (e1.type === CadTypes.Line) {
				e1.end[0] += offset.x;
				e1.end[1] += offset.y;
			}
			this.generatePointsMap();
			const lines = this.findAllAdjacentLines(entity, line.end);
			lines.forEach(e => {
				if (e.type === CadTypes.Line) {
					const l = e as CadLine;
					l.start[0] += offset.x;
					l.start[1] += offset.y;
					l.end[0] += offset.x;
					l.end[1] += offset.y;
					const e2 = vCad.findEntity(e.id) as CadLine;
					if (e2.type === CadTypes.Line) {
						e2.start[0] += offset.x;
						e2.start[1] += offset.y;
						e2.end[0] += offset.x;
						e2.end[1] += offset.y;
					}
				}
				if (e.type === CadTypes.Arc) {
					const a = e as CadArc;
					a.center[0] += offset.x;
					a.center[1] += offset.y;
					const e2 = vCad.findEntity(e.id) as CadArc;
					if (e2.type === CadTypes.Line) {
						e2.center[0] += offset.x;
						e2.center[1] += offset.y;
					}
				}
			});
			vCad.render();
			this.setPoints();
		}
	}

	getCssColor(color?: string) {
		if (color) {
			return getColorLightness(color) < 0.5 ? "black" : "white";
		} else if (typeof this.status.entity?.colorRGB === "number") {
			return "#" + this.status.entity.colorRGB.toString(16).padStart(6, "0");
		}
		return "white";
	}

	setEntityColor(event: MatSelectChange) {
		if (this.status.entity) {
			const color = parseInt(event.value.slice("1"), 16);
			this.status.entity.colorRGB = parseInt(event.value.slice("1"), 16);
			this.vCad.render();
			const e1 = this.cad.findEntity(this.status.entity.id);
			if (e1) {
				e1.colorRGB = color;
			}
		}
	}

	private generatePointsMap() {
		const {cad, accuracy, vCad} = this;
		if (!this.cad) {
			this.pointsMap = [];
			return;
		}
		const pointsMap: LinesAtPoint[] = [];
		const addToMap = (point: Point, line: CadEntity) => {
			const linesAtPoint = pointsMap.find(v => v.point.equalsAppr(point, accuracy));
			if (linesAtPoint) {
				linesAtPoint.lines.push(line);
			} else {
				pointsMap.push({point, lines: [line], tPoint: vCad.translatePoint(point), selected: false});
			}
		};
		const vIdx = this.getVIdx("entities");
		const entities = vCad.data.entities.slice(vIdx, vIdx + cad.data.entities.length);
		entities.forEach(entity => {
			if (entity.type === CadTypes.Line) {
				const lineEntity = entity as CadLine;
				const line = new Line(new Point(lineEntity.start), new Point(lineEntity.end));
				if (line.length > 0) {
					addToMap(line.start, entity);
					addToMap(line.end, entity);
				}
			}
			if (entity.type === CadTypes.Arc) {
				const arcEntity = entity as CadArc;
				const start = new Angle(arcEntity.start_angle, "deg");
				const end = new Angle(arcEntity.end_angle, "deg");
				const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, start, end, arcEntity.clockwise);
				if (arc.length > 0) {
					addToMap(arc.startPoint, entity);
					addToMap(arc.endPoint, entity);
				}
			}
		});
		this.pointsMap = pointsMap;
	}

	private findAdjacentLines(entity: CadEntity, point?: Point): CadEntity[] {
		if (!point) {
			if (entity.type === CadTypes.Line) {
				const start = new Point((entity as CadLine).start);
				const end = new Point((entity as CadLine).end);
				const adjStart = this.findAdjacentLines(entity, start);
				const adjEnd = this.findAdjacentLines(entity, end);
				return [...adjStart, ...adjEnd];
			}
		}
		const pal = this.pointsMap.find(v => v.point.equalsAppr(point, this.accuracy));
		if (pal) {
			const lines = pal.lines.filter(v => v !== entity);
			return lines;
		}
		return [];
	}

	private findAllAdjacentLines(entity: CadEntity, point: Point) {
		const lines: CadEntity[] = [];
		while (entity && point) {
			entity = this.findAdjacentLines(entity, point)[0];
			if (entity) {
				if (entity.type === CadTypes.Line) {
					lines.push(entity);
					const start = new Point((entity as CadLine).start);
					const end = new Point((entity as CadLine).end);
					if (start.equalsAppr(point, this.accuracy)) {
						point = end;
					} else if (end.equalsAppr(point, this.accuracy)) {
						point = start;
					} else {
						point = null;
					}
				}
				if (entity.type === CadTypes.Arc) {
					lines.push(entity);
					const arcEntity = entity as CadArc;
					const starta = new Angle(arcEntity.start_angle, "deg");
					const enda = new Angle(arcEntity.end_angle, "deg");
					const arc = new Arc(new Point(arcEntity.center), arcEntity.radius, starta, enda, arcEntity.clockwise);
					const start = arc.startPoint;
					const end = arc.endPoint;
					if (start.equalsAppr(point, this.accuracy)) {
						point = end;
					} else if (end.equalsAppr(point, this.accuracy)) {
						point = start;
					} else {
						point = null;
					}
				}
			}
		}
		return lines;
	}

	setEntityText(event: Event, field: string) {
		const entity = this.status.entity;
		const value = (event.target as HTMLInputElement).value;
		if (!entity || entity.type !== CadTypes.Line) {
			return;
		}
		entity[field] = value;
		this.cad.findEntity(entity.id)[field] = value;
		this.vCad.render();
	}

	editPartner(id: string) {
		const params = this.route.snapshot.queryParams;
		window.open(`edit-cad?encode=${params.encode}&data=${RSAEncrypt({id})}`);
	}

	getVIdx(field: string) {
		let index = 0;
		for (let i = 0; i < this.status.cadIdx; i++) {
			index += this.cads[i].data[field].length;
		}
		index += Math.max(0, this.status.mode.index);
		return index;
	}

	selectDimLine(i: number, line: number) {
		const {status, vCad} = this;
		if (status.mode.type === "dimension" + line && status.mode.index === i) {
			this.selectLineEnd();
		} else {
			const {entity1, entity2} = vCad.data.dimensions[this.getVIdx("dimensions") + i];
			if (line === 1) {
				vCad.data.entities.forEach(e => (e.selected = e.id === entity1.id));
				this.selectLineBegin("dimension1", i);
			}
			if (line === 2) {
				vCad.data.entities.forEach(e => (e.selected = e.id === entity2.id));
				this.selectLineBegin("dimension2", i);
			}
		}
	}

	editDimension(i: number) {
		this.status.dimension = this.cad.data.dimensions[i];
		const ref: MatDialogRef<DimFormComponent, Dimension> = this.dialog.open(DimFormComponent, {
			data: {cad: this.cad, index: i},
			disableClose: true
		});
		ref.afterClosed().subscribe(dimension => {
			this.vCad.data.dimensions[this.getVIdx("dimensions")] = dimension;
			this.vCad.render();
		});
	}

	get drawDimensions() {
		return this.vCad.config.drawDimensions;
	}
	set drawDimensions(value) {
		this.vCad.config.drawDimensions = value;
		this.vCad.render();
	}

	get drawMTexts() {
		return this.vCad.config.drawMTexts;
	}
	set drawMTexts(value) {
		this.vCad.config.drawMTexts = value;
		this.vCad.render();
	}
}
