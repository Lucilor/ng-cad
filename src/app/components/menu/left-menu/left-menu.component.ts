import {Component, OnInit} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@src/app/cad-viewer/cad-viewer";
import {timeout} from "@src/app/app.common";

@Component({
	selector: "app-left-menu",
	templateUrl: "./left-menu.component.html",
	styleUrls: ["./left-menu.component.scss"]
})
export class LeftMenuComponent implements OnInit {
	cads: {data: CadData; img: string}[];
	constructor() {}

	ngOnInit() {}

	async update(data: CadData[]) {
		this.cads = [];
		for (const d of data) {
			const cad = new CadViewer(d, {width: 200, height: 100, padding: 10});
			this.cads.push({data: d, img: cad.exportImage().src});
			cad.destroy();
			await timeout(0);
		}
	}
}
