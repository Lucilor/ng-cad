import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadDataService} from "@services/cad-data.service";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@app/cad-viewer/cad-data";
import {environment} from "@src/environments/environment";
import {ActivatedRoute} from "@angular/router";

const title = "选取CAD";
@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements AfterViewInit {
	cad: CadViewer;
	cads: {src: string; data: CadData; checked: boolean}[] = [];
	get checkedCads() {
		return this.cads.filter((v) => v.checked);
	}
	tooltipText = [
		"移动：shift+左键 或 中键 或 wasd 或 方向键",
		"缩放：滚轮 或 [键 + ]键",
		"全选：ctrl+a",
		"全不选：esc",
		"锁定下一次鼠标触碰的线：按住Ctrl直至松开"
	].join("\n");
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	constructor(private dataService: CadDataService, private route: ActivatedRoute) {}

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

		window.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				this.selectLines();
			}
		});
		window.addEventListener("beforeunload", () => {
			this.dataService.saveCadStatus(this.cad, title);
		});
	}

	selectLines() {
		const entities = this.cad.selectedEntities;
		const data = new CadData({entities: entities.export(), layers: this.cad.data.layers});
		data.name = "CAD-" + (this.cads.length + 1);
		const cad = new CadViewer(data, {padding: 10});
		this.cads.push({src: cad.exportImage().src, data, checked: false});
		cad.destroy();
	}

	resetData() {
		this.cads = [];
		this.cad.unselectAll();
	}

	editCad(index: number) {
		this.dataService.saveCurrentCad(this.cads[index].data);
		window.open("edit-cad?encode=" + this.route.snapshot.queryParams.encode);
	}

	removeCad(index: number) {
		this.cads.splice(index, 1);
	}

	assenbleCads() {
		const data = new CadData({name: "装配"});
		data.components.data = this.checkedCads.map((v) => v.data);
		this.dataService.saveCurrentCad(data);
		window.open("edit-cad?components=true&encode=" + this.route.snapshot.queryParams.encode);
	}

	removeCads() {
		this.cads = this.cads.filter((v) => !v.checked);
	}

	back() {
		console.log(this.cad.selectedEntities);
	}
}
