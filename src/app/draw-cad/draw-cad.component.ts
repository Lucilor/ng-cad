import {Component, ViewChild, ElementRef, AfterViewInit} from "@angular/core";
import {CadDataService} from "../cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {CadViewer, CadData} from "@lucilor/cad-viewer";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../components/alert/alert.component";

@Component({
	selector: "app-draw-cad",
	templateUrl: "./draw-cad.component.html",
	styleUrls: ["./draw-cad.component.scss"]
})
export class DrawCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	frags: {data: CadData; img: string}[];
	constructor(private dataService: CadDataService, private route: ActivatedRoute, private dialog: MatDialog) {
		this.frags = [];
		// tslint:disable-next-line
		window["view"] = this;
	}

	async ngAfterViewInit() {
		document.title = "查看CAD";
		const params = this.route.snapshot.queryParams;
		const data = await this.dataService.getRawData(params.encode, params.data);
		const cad = new CadViewer(data, innerWidth, innerHeight, {
			selectMode: "multiple",
			drawPolyline: true,
			drawMTexts: true,
			drawDimensions: true
		});
		cad.enableDragging().enableKeyboard().enableWheeling();
		this.cad = cad;
		this.cadContainer.nativeElement.append(cad.view);

		cad.render(!this.dataService.loadViewerStatus(cad, "mainCad"));
		window.addEventListener("beforeunload", () => {
			this.dataService.saveViewerStatus(cad, "mainCad");
		});

		window.addEventListener("keypress", (event) => {
			if (event.key === "Enter") {
				this.selectLines();
			}
		});
	}

	selectLines(fragment?: CadData) {
		const {cad} = this;
		const data: CadData = fragment || {entities: cad.getSelectedEntities(), layers: this.cad.data.layers};
		const lines = data.entities.line;
		if (Object.keys(lines).length < 1) {
			this.dialog.open(AlertComponent, {data: {title: "", content: "至少选择一条线"}});
			return;
		}
		// for (const line of lines) {
		// 	line.selected = false;
		// 	line.selectable = false;
		// 	line.container = null;
		// }
		if (!data.id || !data.name) {
			this.dataService.updateFragments([data]);
		}
		const viewer = new CadViewer(data, 300, 150).render(true);
		viewer.view.id = data.name;
		const img = viewer.exportImage();
		this.frags.unshift({data: viewer.exportData(), img: img.src});
		viewer.destroy();
	}

	removeFragment(fragment: CadData, index: number) {
		this.dataService.removeFragments([fragment]);
		this.frags.splice(index, 1);
	}

	editFragment(fragment: CadData) {
		this.dataService.currentFragment = fragment;
		window.open("edit-cad?encode=" + this.route.snapshot.queryParams.encode);
	}

	resetData() {
		const {dataService, cad} = this;
		dataService.rawData = dataService.rawData;
		dataService.saveViewerStatus(cad, "mainCad");
		cad.reset(dataService.mainData).render(!dataService.loadViewerStatus(cad, "mainCad"));
		this.frags.length = 0;
		dataService.removeFragments(dataService.fragmentsData);
	}
}
