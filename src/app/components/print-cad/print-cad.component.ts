import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@app/cad-viewer/cad-data";
import {CadDataService} from "@services/cad-data.service";
import {environment} from "@src/environments/environment";

@Component({
	selector: "app-print-cad",
	templateUrl: "./print-cad.component.html",
	styleUrls: ["./print-cad.component.scss"]
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
			data = dataService.getCadData()[0];
		}
		if (!data) {
			this.dialog.open(AlertComponent, {data: {content: "没有CAD数据"}});
			return;
		}
		data = new CadData(data);
		this.dataService.saveCurrentCad(data);
		const cad = new CadViewer(data, {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			showLineLength: 0,
			backgroundColor: 0xffffff,
			drawMTexts: true,
			drawDimensions: true
		}).render();
		cad.setControls({dragAxis: "y", selectMode: "none"});
		this.cad = cad;
		this.cadContainer.nativeElement.append(cad.dom);

		// const rect = cad.getBounds();
		// const paddingX = 110;
		// const paddingY = 40;
		// const scale = (innerWidth - paddingX * 2) / rect.width;
		// const x = (innerWidth - rect.width) / 2 - rect.x;
		// const y = (innerHeight - rect.height) / 2 - rect.y - ((rect.height * scale - innerHeight) / 2 + paddingY) / scale;
		// cad.scale = scale;
		// cad.position = new Point(x, y);

		// const h = rect.height * scale + paddingY * 2;
		// cad.resize(null, h);
		// cad.view.style.height = innerHeight + "px";
		// cad.view.style.overflowX = "hidden";
		// cad.view.style.overflowY = "auto";
	}

	print() {
		this.printing = true;
		const cad = this.cad;
		const scale = Math.max(1, this.scale);
		const width = 210 * scale;
		const height = 297 * scale;
		const newViewer = new CadViewer(cad.data.export(), {...cad.config, width, height});
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
