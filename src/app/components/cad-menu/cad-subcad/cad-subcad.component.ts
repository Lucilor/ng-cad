import {Component, OnInit, Input} from "@angular/core";
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
	list: {id: string; name: string; src: string}[] = [];
	listName = "CAD列表";
	get data() {
		const menu = this.menu;
		const d = menu.cad.data.components.data[menu.cadIdx];
		let data: CadData[];
		if (menu.viewMode === "normal") {
			this.listName = "CAD列表";
			data = menu.cad.data.components.data;
		}
		if (menu.viewMode === "partners") {
			this.listName = `${d.name} 的关联CAD`;
			data = d.partners;
		}
		if (menu.viewMode === "components") {
			this.listName = `${d.name} 的装配CAD`;
			data = d.components.data;
		}
		return data;
	}
	constructor() {}

	ngOnInit() {}

	updateList() {
		this.list = [];
		const data = this.data;
		data?.forEach((d) => {
			const cad = new CadViewer(d, {width: 300, height: 150, padding: 10});
			const src = cad.exportImage().src;
			this.list.push({id: d.id, name: d.name, src});
		});
	}

	clickItem(index: number) {
		const {menu} = this;
		const {cadIdx, cadIdx2, viewMode} = menu;
		if (viewMode === "normal") {
			if (index === cadIdx) {
				menu.blur();
			} else {
				menu.focus(index);
			}
		} else {
			if (index === cadIdx2) {
				menu.blur();
			} else {
				menu.focus(cadIdx, index);
			}
		}
	}

	isActive(index: number) {
		const {menu} = this;
		const {cadIdx, cadIdx2, viewMode} = menu;
		return viewMode === "normal" ? index === cadIdx : index === cadIdx2;
	}
}
