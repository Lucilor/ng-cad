import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {CadViewer, CadData, CadRawData} from "@lucilor/cad-viewer";
import {CadDataService} from "../cad-data.service";
import {Point} from "@lucilor/utils";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"],
})
export class PrintCadComponent implements AfterViewInit {
	@ViewChild("cadContainer", {read: ElementRef}) cadContainer: ElementRef<HTMLElement>;
	cad: CadViewer;
	printing = false;
	img = "";
	scale = 16;
	miniMenu = false;
	constructor(private dialog: MatDialog, private dataService: CadDataService) {
		// tslint:disable-next-line
		window["view"] = this;
	}

	async ngAfterViewInit() {
		document.title = "打印CAD";
		const dataService = this.dataService;
		let data: CadData;
		try {
			data = JSON.parse(sessionStorage.getItem("cache-cad-data"));
			sessionStorage.removeItem("cache-cad-data");
		} catch (error) {
			console.warn(error);
		}
		if (!data) {
			data = dataService.currentFragment;
		}
		if (!data) {
			this.dialog.open(AlertComponent, {data: {content: "没有CAD数据"}});
			return;
		}
		data = new CadViewer(data).exportData();
		dataService.rawData = data as CadRawData;
		dataService.removeFragments(dataService.fragmentsData);
		dataService.updateFragments([data]);
		dataService.currentFragment = dataService.fragmentsData[0];
		const cad = new CadViewer(dataService.currentFragment, innerWidth, innerHeight, {
			showLineLength: 0,
			backgroundColor: 0xffffff,
			padding: 50,
			drawMTexts: true,
			drawPolyline: true,
			drawDimensions: true,
			fontSize: 26,
		}).render();
		cad.enableDragging().enableKeyboard().enableWheeling();
		this.cad = cad;
		this.cadContainer.nativeElement.append(cad.view);

		const rect = cad.getBounds();
		const padding = 40;
		const scale = (innerWidth - padding * 2) / rect.width;
		const x = (innerWidth - rect.width) / 2 - rect.x;
		const y = (innerHeight - rect.height) / 2 - rect.y - ((rect.height * scale - innerHeight) / 2 + padding) / scale;
		cad.scale = scale;
		cad.position = new Point(x, y);
		cad.render();
	}

	print() {
		this.printing = true;
		const cad = this.cad;
		const scale = Math.max(1, this.scale);
		const width = 210 * scale;
		const height = 297 * scale;
		const newViewer = new CadViewer(cad.exportData(), width, height, cad.config).render(true);
		this.img = newViewer.exportImage().src;
		newViewer.destroy();
		setTimeout(() => {
			window.print();
			this.img = "";
			this.printing = false;
		}, 0);
	}

	toggleMenu() {}
}
