import {Component, OnInit, Input, Output, EventEmitter} from "@angular/core";
import {CadData} from "@app/cad-viewer/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadMenu} from "../cad-menu.common";

@Component({
	selector: "app-cad-subcad",
	templateUrl: "./cad-subcad.component.html",
	styleUrls: ["./cad-subcad.component.scss"]
})
export class CadSubcadComponent implements OnInit {
	@Input() menu: CadMenu;
	list: {id: string; name: string; index: number; src: string}[] = [];
	@Output() selectCad = new EventEmitter<number>();
	constructor() {}

	ngOnInit() {}

	updateList(data: CadData[]) {
		this.list = [];
		data.forEach((d, i) => {
			const cad = new CadViewer(d, {width: 300, height: 150, padding: 10});
			const src = cad.exportImage().src;
			this.list.push({id: d.id, name: d.name, index: i, src});
		});
	}

	clickItem(index: number) {
		if (index === this.menu.cadIdx) {
			this.selectCad.emit(-1);
			this.menu.cadIdx = -1;
			this.menu.blur();
		} else {
			this.selectCad.emit(index);
			this.menu.cadIdx = index;
			this.menu.focus(index);
		}
	}
}
