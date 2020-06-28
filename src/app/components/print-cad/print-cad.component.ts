import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {environment} from "@src/environments/environment";
import {timeout} from "@src/app/app.common";
import {CadMenu} from "../cad-menu/cad-menu.common";
import {CadDataService} from "@src/app/services/cad-data.service";
import {CadMtext} from "@src/app/cad-viewer/cad-data/cad-entity/cad-mtext";

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
	padding = [40, 110];
	showLineLength = 0;
	dxfPath = "";
	showAll = false;
	suofang = false;
	menu: CadMenu;
	constructor(private dialog: MatDialog, private dataService: CadDataService) {
		// tslint:disable-next-line
		window["view"] = this;
		let cachedData = null;
		try {
			cachedData = JSON.parse(sessionStorage.getItem("cache-cad-data"));
			const params = JSON.parse(sessionStorage.getItem("params"));
			this.dxfPath = sessionStorage.getItem("dxfPath");
			Object.assign(this, params);
		} catch (error) {
			console.warn(error);
		}
		if (!cachedData) {
			this.dialog.open(AlertComponent, {data: {content: "没有CAD数据"}});
			return;
		}
		const data = new CadData();
		data.components.data.push(new CadData(cachedData));
		const cad = new CadViewer(data, {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			showLineLength: this.showLineLength,
			backgroundColor: 0xffffff,
			padding: this.padding
		});
		cad.traverse((o, e) => {
			o.userData.selectable = e instanceof CadMtext;
		});
		this.cad = cad;
		cad.setControls({dragAxis: "y", selectMode: "single", enableScale: this.suofang});
		this.menu = new CadMenu(dialog, cad, dataService);
		this.menu.cadIdx = 0;
		this.menu.cadIdxs2 = [0];
	}

	async ngAfterViewInit() {
		document.title = "打印CAD";
		const dom = this.cad.dom;
		this.cadContainer.nativeElement.append(dom);

		if (!this.showAll) {
			dom.style.overflowX = "hidden";
			dom.style.overflowY = "auto";
		}
		this.resetCad();
	}

	async print() {
		const cad = this.cad;
		const scale = Math.max(1, this.scale);
		const width = 210 * scale;
		const height = 297 * scale;
		cad.resize(width, height).render(true);
		this.printing = true;
		this.img = cad.exportImage().src;
		this.resetCad();
		await timeout();
		window.print();
		this.img = "";
		this.printing = false;
	}

	resetCad() {
		const {cad, padding} = this;
		let h = innerHeight;
		if (!this.showAll) {
			const rect = cad.getBounds();
			const scale = (innerWidth - padding[1] * 2) / rect.width;
			h = rect.height * scale + padding[0] * 2;
		}
		cad.resize(innerWidth, h).render(true);
		cad.dom.style.height = innerHeight + "px";
	}

	saveAsDxf() {
		this.dataService.saveAsDxf(this.cad.data, this.dxfPath);
	}
}
