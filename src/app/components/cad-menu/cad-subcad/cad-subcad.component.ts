import {Component, OnInit, Input, Output, EventEmitter} from "@angular/core";
import {CadData} from "@app/cad-viewer/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";

@Component({
	selector: "app-cad-subcad",
	templateUrl: "./cad-subcad.component.html",
	styleUrls: ["./cad-subcad.component.scss"]
})
export class CadSubcadComponent implements OnInit {
	list: {id: string; name: string; index: number; src: string}[] = [];
	index = -1;
	@Output() selectCad = new EventEmitter<number>();
	constructor() {}

	ngOnInit() {}

	updateList(data: CadData[]) {
		this.list = [];
		data.forEach((d, i) => {
			const cad = new CadViewer(d, {width: 300, height: 150});
			const src = cad.exportImage().src;
			this.list.push({id: d.id, name: d.name, index: i, src});
		});
	}

	clickItem(index: number) {
		this.selectCad.emit(index);
		this.index = index;
	}
}
