import {Component, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData, CadOption} from "@src/app/cad-viewer/cad-data/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadDataService} from "@services/cad-data.service";

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
	width = 300;
	height = 150;
	searchInput = "";
	searchValue = "";
	checkedIndex = -1;
	checkedItems: CadData[] = [];
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;
	constructor(
		public dialogRef: MatDialogRef<ListCadComponent, CadData[]>,
		@Inject(MAT_DIALOG_DATA) public data: {selectMode: "single" | "multiple"; checkedItems?: CadData[]; options?: CadOption[]},
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

	async getData(page: number, withOption = false) {
		let options: CadOption[] = [];
		if (withOption) {
			options = this.data.options || [];
			console.log(options);
		}
		const data = await this.dataService.getCadDataPage(page, this.paginator.pageSize, this.searchValue, true, options);
		this.length = data.count;
		this.pageData.length = 0;
		data.data.forEach((d) => {
			try {
				d.entities.dimension.forEach((v) => (v.visible = false));
				d.entities.mtext.forEach((v) => (v.visible = false));
				const cad = new CadViewer(d, {width: this.width, height: this.height, padding: 10});
				const checked = this.checkedItems.find((v) => v.id === d.id) ? true : false;
				const img = cad.exportImage().src;
				this.pageData.push({data: cad.data, img, checked});
				cad.destroy();
			} catch (e) {
				console.warn(e);
				this.pageData.push({
					data: new CadData({id: d.id, name: d.name}),
					img: "",
					checked: false
				});
			}
		});
		return data;
	}

	submit() {
		this.syncCheckedItems();
		this.dialogRef.close(this.checkedItems.map((v) => new CadData(v.export())));
	}

	close() {
		this.dialogRef.close();
	}

	search(withOption = false) {
		this.searchValue = this.searchInput;
		this.paginator.pageIndex = 0;
		this.getData(this.paginator.pageIndex + 1, withOption);
	}

	searchKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.search();
		}
	}

	syncCheckedItems() {
		// this.pageData.forEach((v) => {
		// 	if (v.checked) {
		// 		const index = this.checkedItems.findIndex((vv) => vv.id === v.data.id);
		// 		if (index === -1) {
		// 			this.checkedItems.push(v.data);
		// 		} else {
		// 			this.checkedItems[index] = v.data;
		// 		}
		// 	}
		// });
		this.checkedItems = this.pageData.filter((v) => v.checked).map((v) => v.data);
	}
}
