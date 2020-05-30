import {Component, AfterViewInit, ViewChild, ElementRef} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {AlertComponent} from "../alert/alert.component";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {environment} from "@src/environments/environment";
import {timeout} from "@src/app/app.common";

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
	showAll = false;
	suofang = false;
	constructor(private dialog: MatDialog) {
		// tslint:disable-next-line
		window["view"] = this;
	}

	async ngAfterViewInit() {
		document.title = "打印CAD";
		let data: CadData;
		try {
			data = JSON.parse(sessionStorage.getItem("cache-cad-data"));
			const params = JSON.parse(sessionStorage.getItem("params"));
			Object.assign(this, params);
		} catch (error) {
			console.warn(error);
		}
		if (!data) {
			this.dialog.open(AlertComponent, {data: {content: "没有CAD数据"}});
			return;
		}
		data = new CadData(data);
		const cad = new CadViewer(data, {
			width: innerWidth,
			height: innerHeight,
			showStats: !environment.production,
			showLineLength: this.showLineLength,
			backgroundColor: 0xffffff,
			padding: this.padding
		});
		this.cad = cad;
		cad.setControls({dragAxis: this.suofang ? "" : "y", selectMode: "none", enableScale: this.suofang});
		this.cadContainer.nativeElement.append(cad.dom);

		if (!this.showAll) {
			cad.dom.style.overflowX = "hidden";
			cad.dom.style.overflowY = "auto";
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
}
