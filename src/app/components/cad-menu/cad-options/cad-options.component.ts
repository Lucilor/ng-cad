import {Component, Inject, ViewChild, AfterViewInit} from "@angular/core";
import {CadDataService} from "@src/app/services/cad-data.service";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {MatPaginator, PageEvent} from "@angular/material/paginator";
import {CadData} from "@src/app/cad-viewer/cad-data/cad-data";

@Component({
	selector: "app-cad-options",
	templateUrl: "./cad-options.component.html",
	styleUrls: ["./cad-options.component.scss"]
})
export class CadOptionsComponent implements AfterViewInit {
	pageData: {value: string; img: string; checked: boolean}[] = [];
	searchInput = "";
	searchValue = "";
	length = 100;
	pageSizeOptions = [50, 100, 200, 500];
	pageSize = 50;
	checkedItems: string[] = [];
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;
	constructor(
		private dataService: CadDataService,
		public dialogRef: MatDialogRef<CadOptionsComponent, string[]>,
		@Inject(MAT_DIALOG_DATA) public data: {data: CadData; name: string; checkedItems: string[]}
	) {}

	async ngAfterViewInit() {
		await this.paginator.initialized.toPromise();
		this.getData(1);
	}

	submit() {
		this.dialogRef.close(this.pageData.filter((v) => v.checked).map((v) => v.value));
	}

	close() {
		this.dialogRef.close();
	}

	searchKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.search();
		}
	}

	search() {
		this.searchValue = this.searchInput;
		this.paginator.pageIndex = 0;
		this.getData(this.paginator.pageIndex + 1);
	}

	changePage(event: PageEvent) {
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number) {
		const data = await this.dataService.getOptions(this.data.data, this.data.name, this.searchValue, page, this.paginator.pageSize);
		this.length = data.count;
		this.pageData.length = 0;
		data.data.forEach((v) => {
			this.pageData.push({value: v.name, img: v.img, checked: this.data.checkedItems.includes(v.name)});
		});
		console.log(data);
		return data;
	}
}
