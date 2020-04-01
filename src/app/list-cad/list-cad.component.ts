import {Component, OnInit, Inject} from "@angular/core";
import {CadDataService} from "../cad-data.service";
import {ActivatedRoute} from "@angular/router";
import {PageEvent} from "@angular/material/paginator";
import {CadViewer} from "@lucilor/cad-viewer";
import {MatDialogRef, MAT_DIALOG_DATA} from "@angular/material/dialog";

@Component({
	selector: "app-list-cad",
	templateUrl: "./list-cad.component.html",
	styleUrls: ["./list-cad.component.scss"]
})
export class ListCadComponent implements OnInit {
	length = 100;
	pageSizeOptions = [5, 10, 15, 20];
	pageSize = 5;
	pageData: {id: string; name: string; img: string; checked: boolean}[] = [];
	width: 300;
	height: 150;
	checkedIndex = -1;
	constructor(
		public dialogRef: MatDialogRef<ListCadComponent, string | string[]>,
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

	async getData(page: number) {
		const params = this.route.snapshot.queryParams;
		const data = await this.dataService.getCadDataPage(params.encode, page, this.pageSize);
		this.length = data.count;
		this.pageData.length = 0;
		data.data.forEach(d => {
			const cad = new CadViewer(d, this.width, this.height, {drawDimensions: true}).render(true);
			this.pageData.push({id: cad.data.id, name: cad.data.name, img: cad.exportImage().src, checked: false});
			cad.destroy();
		});
		return data;
	}

	submit() {
		if (this.data.selectMode === "single") {
			this.dialogRef.close(this.pageData[this.checkedIndex].id);
		}
		if (this.data.selectMode === "multiple") {
			this.dialogRef.close(this.pageData.filter(v => v.checked).map(v => v.id));
		}
	}

	close() {
		this.dialogRef.close();
	}
}
