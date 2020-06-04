import {Component, AfterViewInit, ViewChild, ElementRef, OnDestroy} from "@angular/core";
import {CadDataService} from "@services/cad-data.service";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData, CadOption} from "@src/app/cad-viewer/cad-data/cad-data";
import {environment} from "@src/environments/environment";
import {ActivatedRoute, Router} from "@angular/router";
import {RSAEncrypt} from "@lucilor/utils";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {CadOptionsComponent} from "../cad-menu/cad-options/cad-options.component";

const title = "选取CAD";
@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements AfterViewInit, OnDestroy {
	cad: CadViewer;
	cads: {src: string; data: CadData; checked: boolean; length: string}[] = [];
	get checkedCads() {
		return this.cads.filter((v) => v.checked);
	}
	tooltipText = [
		"移动：shift+左键 或 中键 或 wasd 或 方向键",
		"缩放：滚轮 或 [键 + ]键",
		"全选：ctrl+a",
		"全不选：esc",
		"锁定下一次鼠标触碰的线：按住Ctrl"
	].join("\n");
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	fromEdit = false;
	drawDimensions = true;
	drawMTexts = true;
	sampleFormulas: string[] = [];
	postData: string;
	constructor(private dataService: CadDataService, private route: ActivatedRoute, private router: Router, private dialog: MatDialog) {}

	async ngAfterViewInit() {
		document.title = title;
		// tslint:disable-next-line: no-string-literal
		window["view"] = this;
		const data = (await this.dataService.getCadData())[0];
		this.cad = new CadViewer(data, {
			width: innerWidth,
			height: innerHeight,
			padding: [20, 20, 20, 100],
			showStats: !environment.production
		});
		this.cad.setControls({selectMode: "multiple"});
		this.cadContainer.nativeElement.append(this.cad.dom);
		this.dataService.loadCadStatus(this.cad, title);
		this.fromEdit = this.route.snapshot.queryParams.fromEdit || false;
		if (this.fromEdit) {
			data.components.data.forEach((d) => {
				d = d.clone();
				const cad = new CadViewer(d, {padding: 10});
				this.cads.push({src: cad.exportImage().src, data: d, checked: false, length: this.getCadLength(d)});
				this.cad.removeEntities(d.entities);
				if (d.conditions.length < 1) {
					d.conditions.push("");
				}
				if (d.options.length < 1) {
					d.options.push(new CadOption());
				}
			});
			data.components.data = [];
		}

		window.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				this.selectLines();
			}
		});
		window.addEventListener("beforeunload", () => {
			this.dataService.saveCadStatus(this.cad, title);
		});
		window.addEventListener("resize", () => {
			this.cad.resize(innerWidth, innerHeight);
		});
	}

	ngOnDestroy() {
		this.cad.destroy();
	}

	selectLines(entities = this.cad.selectedEntities) {
		if (entities.length < 1) {
			return;
		}
		const data = new CadData({entities: entities.export(), layers: this.cad.data.layers});
		if (data.conditions.length < 1) {
			data.conditions.push("");
		}
		if (data.options.length < 1) {
			data.options.push(new CadOption());
		}
		data.name = "CAD-" + (this.cads.length + 1);
		const cad = new CadViewer(data, {padding: 10});
		this.cads.push({src: cad.exportImage().src, data, checked: false, length: this.getCadLength(data)});
		this.cad.data.getAllEntities().dimension.forEach((d) => {
			if (data.findEntity(d.entity1.id) || data.findEntity(d.entity2.id)) {
				data.entities.dimension.push(d);
			}
		});
		cad.destroy();
		if (this.fromEdit) {
			data.type = this.cad.data.type;
			data.conditions = this.cad.data.conditions;
			data.options = this.cad.data.options;
			this.cad.removeEntities(entities);
		}
	}

	resetData() {
		this.cads = [];
		this.cad.unselectAll();
	}

	editCad(index: number) {
		sessionStorage.removeItem("data");
		this.dataService.saveCurrentCad(this.cads[index].data);
		window.open("edit-cad?encode=" + this.route.snapshot.queryParams.encode);
	}

	removeCad(index: number) {
		this.cad.addEntities(this.cads[index].data.entities);
		this.cads.splice(index, 1);
	}

	removeCads() {
		this.cads = this.cads.filter((v) => !v.checked);
	}

	async back(submit: boolean) {
		if (submit) {
			const {cads, cad, dataService} = this;
			const resDataArr = await dataService.postCadData(
				cads.map((v) => v.data),
				RSAEncrypt({collection: "cad"})
			);
			resDataArr.forEach((d) => {
				try {
					const component = d.clone(true);
					cad.data.addComponent(component);
					cad.data.directAssemble(d);
				} catch (error) {
					console.warn(error);
				}
			});
			await dataService.postCadData([cad.data]);
		}
		await this.router.navigate(["edit-cad"]);
	}

	selectOptions(option: CadOption | string, index: number) {
		const data = this.cads[index].data;
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

	addOption(data: CadData, index: number) {
		data.options.splice(index + 1, 0, new CadOption());
	}

	removeOption(data: CadData, index: number) {
		data.options.splice(index, 1);
		if (data.options.length < 1) {
			data.options = [new CadOption()];
		}
	}

	addCondition(data: CadData, index: number) {
		data.conditions.splice(index + 1, 0, "");
	}

	removeCondition(data: CadData, index: number) {
		data.conditions.splice(index, 1);
		if (data.conditions.length < 1) {
			data.conditions = [""];
		}
	}

	getCadLength(data: CadData) {
		const entities = data.getAllEntities();
		let length = 0;
		entities.line.forEach((v) => (length += v.length));
		entities.arc.forEach((v) => (length += v.curve.getLength()));
		entities.circle.forEach((v) => (length += v.curve.getLength()));
		return length.toFixed(2);
	}
}
