import {Component, OnInit, Inject, ViewChild} from "@angular/core";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";
import {CadData} from "@app/cad-viewer/cad-data";
import {CadViewer} from "@app/cad-viewer/cad-viewer";
import {CadDataService} from "@services/cad-data.service";

@Component({
	selector: "app-list-cad",
	templateUrl: "./list-cad.component.html",
	styleUrls: ["./list-cad.component.scss"]
})
export class ListCadComponent implements OnInit {
	length = 100;
	pageSizeOptions = [1, 10, 20, 30, 40, 50];
	pageSize = 10;
	pageData: {data: CadData; img: string; checked: boolean}[] = [];
	width = 300;
	height = 150;
	searchInput: "";
	searchValue: "";
	checkedIndex = -1;
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;
	constructor(
		public dialogRef: MatDialogRef<ListCadComponent, CadData | CadData[]>,
		@Inject(MAT_DIALOG_DATA) public data: {selectMode: "single" | "multiple"},
		private dataService: CadDataService
	) {}

	ngOnInit() {
		setTimeout(() => {
			this.getData(1);
		}, 0);
	}

	changePage(event: PageEvent) {
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number) {
		const data = await this.dataService.getCadDataPage(page, this.paginator.pageSize, this.searchValue);
		this.length = data.count;
		this.pageData.length = 0;
		data.data.forEach((d) => {
			try {
				d.entities.dimension = [];
				d.entities.mtext = [];
				const cad = new CadViewer(d, {width: this.width, height: this.height});
				this.pageData.push({data: cad.data, img: cad.exportImage().src, checked: false});
				cad.destroy();
			} catch (e) {
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
