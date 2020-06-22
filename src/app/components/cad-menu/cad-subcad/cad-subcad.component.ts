import {Component, OnInit, Input} from "@angular/core";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadMenu} from "../cad-menu.common";
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {ListCadComponent} from "../../list-cad/list-cad.component";
import {RSAEncrypt} from "@lucilor/utils";
import {CadDataService} from "@src/app/services/cad-data.service";

@Component({
	selector: "app-cad-subcad",
	templateUrl: "./cad-subcad.component.html",
	styleUrls: ["./cad-subcad.component.scss"]
})
export class CadSubcadComponent implements OnInit {
	@Input() menu: CadMenu;
	list: {id: string; name: string; src: string; checked: boolean}[] = [];
	listName = "CAD列表";
	multi = false;
	allSelected: boolean;
	get data() {
		const menu = this.menu;
		const d = menu.cad.data.components.data[menu.cadIdx];
		let data: CadData[];
		if (menu.viewMode === "normal" || menu.viewMode === "validation") {
			this.listName = "CAD列表";
			this.multi = false;
			data = menu.cad.data.components.data;
		}
		if (menu.viewMode === "partners") {
			this.listName = `${d.name} 的关联CAD`;
			this.multi = false;
			data = d.partners;
		}
		if (menu.viewMode === "components") {
			this.listName = `${d.name} 的装配CAD`;
			this.multi = true;
			data = d.components.data;
		}
		return data;
	}
	constructor(private dialog: MatDialog, private dataService: CadDataService) {}

	ngOnInit() {
		window.addEventListener("keydown", ({key}) => {
			if (this.multi && key === "Escape") {
				this.unselectAll();
			}
		});
	}

	updateList() {
		this.list = [];
		const {data, menu} = this;
		data?.forEach((d, i) => {
			const cad = new CadViewer(d, {width: 300, height: 150, padding: 10});
			const src = cad.exportImage().src;
			this.list.push({id: d.id, name: d.name, src, checked: menu.cadIdxs2.includes(i)});
			cad.destroy();
		});
		this.allSelected = this.list.every((v) => v.checked);
	}

	clickItem(index: number) {
		const {menu} = this;
		const {cadIdx, cadIdxs2, viewMode} = menu;
		this.list[index].checked = !this.list[index].checked;
		if (viewMode === "normal") {
			if (index === cadIdx) {
				menu.blur();
			} else {
				menu.focus(index);
			}
		} else {
			if (this.multi) {
				menu.cadIdxs2.length = 0;
				this.list.forEach((v, i) => {
					if (v.checked) {
						menu.cadIdxs2.push(i);
					}
				});
				menu.focus();
			} else {
				menu.cadIdxs2 = index === cadIdxs2[0] ? [] : [index];
				menu.focus();
			}
		}
		this.allSelected = this.list.every((v) => v.checked);
	}

	isActive(index: number) {
		const {menu} = this;
		const {cadIdx, cadIdxs2, viewMode} = menu;
		return viewMode === "normal" ? index === cadIdx : index === cadIdxs2[0];
	}

	editSubcads(type: string) {
		const {menu} = this;
		const data = menu.getData(menu.cadIdx, -1);
		let checkedItems: CadData[];
		if (type === "partners") {
			checkedItems = [...data.partners];
		}
		if (type === "components") {
			checkedItems = [...data.components.data];
		}
		const ref: MatDialogRef<ListCadComponent, CadData[]> = this.dialog.open(ListCadComponent, {
			data: {selectMode: "multiple", checkedItems, options: data.options},
			width: "80vw"
		});
		ref.afterClosed().subscribe(async (cads) => {
			if (Array.isArray(cads)) {
				cads = cads.map((v) => v.clone(true));
				if (type === "partners") {
					data.partners = cads;
				}
				if (type === "components") {
					data.components.data = cads;
				}
				menu.cad.data.components.data[menu.cadIdx] = data;
				menu.cadIdxs2 = [];
				for (let i = 0; i < cads.length; i++) {
					menu.cadIdxs2.push(i);
				}
				menu.cad.data.updatePartners().updateComponents();
				menu.cad.reset();
				this.updateList();
			}
		});
	}

	cadImageClick() {
		this.menu.focus();
	}

	deleteSelected() {
		const {menu} = this;
		const data = menu.getData(menu.cadIdx, -1);
		if (menu.viewMode === "partners") {
			data.partners = data.partners.filter((_v, i) => !menu.cadIdxs2.includes(i));
		}
		if (menu.viewMode === "components") {
			data.components.data = data.components.data.filter((_v, i) => !menu.cadIdxs2.includes(i));
		}
		menu.cadIdxs2 = [];
		this.updateList();
		menu.cad.reset();
		menu.focus();
	}

	editSelected() {
		const {menu} = this;
		const data = menu.getData(menu.cadIdx, -1);
		let ids: string[];
		if (menu.viewMode === "partners") {
			ids = data.partners.filter((_v, i) => menu.cadIdxs2.includes(i)).map((v) => v.id);
		}
		if (menu.viewMode === "components") {
			ids = data.components.data.filter((_v, i) => menu.cadIdxs2.includes(i)).map((v) => v.id);
		}
		if (ids.length) {
			sessionStorage.setItem("tmpData", RSAEncrypt({ids}));
			open("edit-cad");
		}
	}

	selectAll() {
		const menu = this.menu;
		if (this.allSelected) {
			this.list.forEach((v) => (v.checked = false));
			this.allSelected = false;
		} else {
			this.list.forEach((v) => (v.checked = true));
			this.allSelected = true;
		}
		menu.cadIdxs2.length = 0;
		this.list.forEach((v, i) => {
			if (v.checked) {
				menu.cadIdxs2.push(i);
			}
		});
		menu.focus();
	}

	unselectAll() {
		const menu = this.menu;
		this.list.forEach((v) => (v.checked = false));
		this.allSelected = false;
		menu.cadIdxs2.length = 0;
		menu.focus();
	}

	downloadDxf() {
		const data = this.menu.getData();
		this.menu.removeCadGongshis(data);
		this.dataService.downloadDxf(data);
	}
}
