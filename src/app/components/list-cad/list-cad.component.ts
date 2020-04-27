import {Component, OnInit, Inject, ViewChild} from "@angular/core";
import {CadDataService} from "../../cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {PageEvent, MatPaginator} from "@angular/material/paginator";
import {CadViewer, CadData} from "@lucilor/cad-viewer";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";

@Component({
	selector: "app-list-cad",
	templateUrl: "./list-cad.component.html",
	styleUrls: ["./list-cad.component.scss"]
})
export class ListCadComponent implements OnInit {
	length = 100;
	pageSizeOptions = [10, 20, 30, 40, 50];
	pageSize = 10;
	pageData: {data: CadData; img: string; checked: boolean}[] = [];
	width: 300;
	height: 150;
	searchValue: "";
	checkedIndex = -1;
	@ViewChild("paginator", {read: MatPaginator}) paginator: MatPaginator;
	constructor(
		public dialogRef: MatDialogRef<ListCadComponent, CadData | CadData[]>,
		@Inject(MAT_DIALOG_DATA) public data: {selectMode: "single" | "multiple"},
		private dataService: CadDataService,
		private route: ActivatedRoute
	) {}

	ngOnInit() {
		setTimeout(() => {
			this.getData(1);
		}, 0);
	}

	changePage(event: PageEvent) {
		this.getData(event.pageIndex + 1);
	}

	async getData(page: number, search = "") {
		const params = this.route.snapshot.queryParams;
		const data = await this.dataService.getCadDataPage(params.encode, page, this.paginator.pageSize, search);
		this.length = data.count;
		this.pageData.length = 0;
		data.data.forEach((d) => {
			try {
				const cad = new CadViewer(d, this.width, this.height, {drawDimensions: false, drawMTexts: false}).render(true);
				this.pageData.push({data: cad.data, img: cad.exportImage().src, checked: false});
				cad.destroy();
			} catch (e) {
				this.pageData.push({
					data: {id: d.id, name: d.name, entities: {line: [], arc: [], circle: [], mtext: [], dimension: [], hatch: []}},
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
		this.getData(this.paginator.pageIndex + 1, this.searchValue);
	}

	searchKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.search();
		}
	}
}
