import {Component, OnInit, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";
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
	pageSizeOptions = [1, 10, 20, 30, 40, 50];
	pageSize = 10;
	pageData: {data: CadData; img: string; checked: boolean}[] = [];
	width = 300;
	height = 150;
	searchInput = "";
	searchValue = "";
	checkedIndex = -1;
	checkedItems: string[] = [];
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;
	constructor(
		public dialogRef: MatDialogRef<ListCadComponent, CadData | CadData[]>,
		@Inject(MAT_DIALOG_DATA) public data: {selectMode: "single" | "multiple"; checkedItems?: string[]},
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
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number) {
		const data = await this.dataService.getCadDataPage(page, this.paginator.pageSize, this.searchValue, true);
		this.length = data.count;
		this.pageData.length = 0;
		data.data.forEach((d) => {
			try {
				d.entities.dimension = [];
				d.entities.mtext = [];
				const cad = new CadViewer(d, {width: this.width, height: this.height, padding: 10});
				const checked = this.checkedItems.includes(d.id);
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
		if (this.data.selectMode === "single") {
			this.dialogRef.close(this.pageData[this.checkedIndex].data);
		}
		if (this.data.selectMode === "multiple") {
			this.dialogRef.close(this.pageData.filter((v) => v.checked).map((v) => v.data));
		}
	}

	close() {
		this.dialogRef.close();
	}

	search() {
		this.searchValue = this.searchInput;
		this.paginator.pageIndex = 0;
		this.getData(this.paginator.pageIndex + 1);
	}

	searchKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.search();
		}
	}
}
