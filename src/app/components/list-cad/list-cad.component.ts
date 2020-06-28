import {Component, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData, CadOption} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadDataService} from "@services/cad-data.service";
import {timeout} from "@src/app/app.common";

@Component({
	selector: "app-list-cad",
	templateUrl: "./list-cad.component.html",
	styleUrls: ["./list-cad.component.scss"]
})
export class ListCadComponent implements AfterViewInit {
	length = 100;
	pageSizeOptions = [1, 10, 20, 50, 100];
	pageSize = 10;
	pageData: {data: CadData; img: string; checked: boolean}[] = [];
	tableData: any = [];
	displayedColumns = ["select", "mingzi", "wenjian", "create_time", "modify_time"];
	width = 300;
	height = 150;
	searchInput = "";
	searchValue = "";
	checkedIndex = -1;
	checkedItems: CadData[] = [];
	checkedColumns: any[] = [];
	checkedInOtherPages = false;
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;
	constructor(
		public dialogRef: MatDialogRef<ListCadComponent, CadData[]>,
		@Inject(MAT_DIALOG_DATA)
		public data: {selectMode: "single" | "multiple" | "table"; checkedItems?: CadData[]; options?: CadOption[]; type: string},
		private dataService: CadDataService
	) {}

	async ngAfterViewInit() {
		await this.paginator.initialized.toPromise();
		if (Array.isArray(this.data.checkedItems)) {
			this.checkedItems = this.data.checkedItems;
		}
		this.getData(1);
	}

	changePage(event: PageEvent) {
		this.syncCheckedItems();
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number, withOption = false, matchType: "and" | "or" = "and") {
		let options: CadOption[] = [];
		if (withOption) {
			options = this.data.options || [];
		}
		const limit = this.paginator.pageSize;
		const type = this.data.type;
		if (this.data.selectMode === "table") {
			const data = await this.dataService.getCadListPage(type, page, limit, this.searchValue);
			this.length = data.count;
			this.pageData.length = 0;
			this.tableData = data.data;
		} else {
			const data = await this.dataService.getCadDataPage(type, page, limit, this.searchValue, true, options, matchType);
			this.length = data.count;
			this.pageData.length = 0;
			for (const d of data.data) {
				try {
					d.entities.dimension.forEach((v) => (v.visible = false));
					d.entities.mtext.forEach((v) => (v.visible = false));
					const cad = new CadViewer(d, {width: this.width, height: this.height, padding: 10});
					const checked = this.checkedItems.find((v) => v.id === d.id) ? true : false;
					const img = cad.exportImage().src;
					this.pageData.push({data: cad.data, img, checked});
					cad.destroy();
					// (trying to) prevent WebGL contexts lost
					await timeout(0);
				} catch (e) {
					console.warn(e);
					this.pageData.push({
						data: new CadData({id: d.id, name: d.name}),
						img: "",
						checked: false
					});
				}
			}
			this.syncCheckedItems();
			return data;
		}
	}

	async submit() {
		if (this.data.selectMode === "table") {
			const data = await this.dataService.getCadData({vid: this.checkedColumns[0].vid});
			this.dialogRef.close(data);
		} else {
			this.syncCheckedItems();
			this.dialogRef.close(this.checkedItems.map((v) => new CadData(v.export())));
		}
	}

	close() {
		this.dialogRef.close();
	}

	search(withOption = false, matchType: "and" | "or" = "and") {
		this.searchValue = this.searchInput;
		this.paginator.pageIndex = 0;
		this.getData(this.paginator.pageIndex + 1, withOption, matchType);
	}

	searchKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.search();
		}
	}

	syncCheckedItems() {
		if (this.checkedIndex === -1) {
			const toRemove = [];
			let checkedNum = 0;
			this.pageData.forEach((v) => {
				const index = this.checkedItems.findIndex((vv) => vv.id === v.data.id);
				if (v.checked) {
					if (index === -1) {
						this.checkedItems.push(v.data);
					} else {
						this.checkedItems[index] = v.data;
					}
					checkedNum++;
				} else if (index > -1) {
					toRemove.push(v.data.id);
				}
			});
			this.checkedItems = this.checkedItems.filter((v) => !toRemove.includes(v.id));
			this.checkedInOtherPages = checkedNum < this.checkedItems.length;
		} else {
			this.checkedItems = [this.pageData[this.checkedIndex].data];
		}
	}

	toggleSelectAll() {
		if (this.allChecked()) {
			this.pageData.forEach((v) => (v.checked = false));
			this.checkedItems.length = 0;
		} else {
			this.pageData.forEach((v) => (v.checked = true));
			this.syncCheckedItems();
		}
	}

	allChecked() {
		return !this.pageData.every((v) => !v.checked);
	}

	partiallyChecked() {
		if (this.checkedInOtherPages) {
			return true;
		}
		const ckeckedNum = this.pageData.filter((v) => v.checked).length;
		return ckeckedNum > 0 && ckeckedNum < this.pageData.length;
	}
}
