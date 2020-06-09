import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";

import {AppRoutingModule} from "./app-routing.module";
import {AppComponent} from "./app.component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {DrawCadComponent} from "@components/draw-cad/draw-cad.component";
import {LoadingComponent} from "./components/loading/loading.component";
import {StoreModule} from "@ngrx/store";
import {reducers, metaReducers} from "./store/reducers";
import {HttpClientModule} from "@angular/common/http";

import {MatDialogModule} from "@angular/material/dialog";
import {MatButtonModule} from "@angular/material/button";
import {MatInputModule} from "@angular/material/input";
import {MatExpansionModule} from "@angular/material/expansion";
import {MatIconModule} from "@angular/material/icon";
import {MatSelectModule} from "@angular/material/select";
import {MatPaginatorModule, MatPaginatorIntl} from "@angular/material/paginator";
import {MatRadioModule} from "@angular/material/radio";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatMenuModule} from "@angular/material/menu";
import {MatTableModule} from "@angular/material/table";
import {MatSlideToggleModule} from "@angular/material/slide-toggle";

import {DragDropModule} from "@angular/cdk/drag-drop";
import {ScrollingModule} from "@angular/cdk/scrolling";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS} from "@angular/material/snack-bar";
import {ColorPickerModule} from "@syncfusion/ej2-angular-inputs";

import {PageNotFoundComponent} from "./components/page-not-found/page-not-found.component";
import {AlertComponent} from "./components/alert/alert.component";
import {EditCadComponent} from "@components/edit-cad/edit-cad.component";
import {PrintCadComponent} from "@components/print-cad/print-cad.component";
import {ListCadComponent} from "@components/list-cad/list-cad.component";
import {MyMatPaginatorIntl} from "./MyMatPaginatorIntl";
import {CadInfoComponent as CadInfoComponent2} from "./components/cad-menu/cad-info/cad-info.component";
import {CadLineComponent} from "./components/cad-menu/cad-line/cad-line.component";
import {LineIndicatorComponent} from "./components/cad-menu/line-indicator/line-indicator.component";
import {CadDimensionComponent} from "./components/cad-menu/cad-dimension/cad-dimension.component";
import {CadDimensionFormComponent} from "./components/cad-menu/cad-dimension-form/cad-dimension-form.component";
import {CadSubcadComponent} from "./components/cad-menu/cad-subcad/cad-subcad.component";
import {CadAssembleComponent} from "./components/cad-menu/cad-assemble/cad-assemble.component";
import {CadOptionsComponent} from "./components/cad-menu/cad-options/cad-options.component";
import {CadMtextComponent} from "./components/cad-menu/cad-mtext/cad-mtext.component";
import {IndexComponent} from "./components/index/index.component";
import {AngleInputComponent} from "./components/index/angle-input/angle-input.component";
import {ImageComponent} from "./components/image/image.component";
import {ToolbarComponent} from "./components/menu/toolbar/toolbar.component";
import {SubCadsComponent} from "./components/menu/sub-cads/sub-cads.component";
import {CadInfoComponent} from "./components/menu/cad-info/cad-info.component";
import {ExpressionAnalysisComponent} from "./components/expression-analysis/expression-analysis.component";

@NgModule({
	declarations: [
		AppComponent,
		DrawCadComponent,
		LoadingComponent,
		PageNotFoundComponent,
		AlertComponent,
		EditCadComponent,
		PrintCadComponent,
		ListCadComponent,
		CadInfoComponent2,
		CadLineComponent,
		LineIndicatorComponent,
		CadDimensionComponent,
		CadDimensionFormComponent,
		CadSubcadComponent,
		CadAssembleComponent,
		CadOptionsComponent,
		CadMtextComponent,
		IndexComponent,
		AngleInputComponent,
		ImageComponent,
		ToolbarComponent,
		SubCadsComponent,
		CadInfoComponent,
		ExpressionAnalysisComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		BrowserAnimationsModule,
		StoreModule.forRoot(reducers, {
			metaReducers,
			runtimeChecks: {
				strictStateImmutability: true,
				strictActionImmutability: true
			}
		}),
		HttpClientModule,
		MatDialogModule,
		MatButtonModule,
		MatInputModule,
		MatExpansionModule,
		MatIconModule,
		MatSelectModule,
		MatSnackBarModule,
		MatPaginatorModule,
		MatRadioModule,
		MatCheckboxModule,
		MatTooltipModule,
		MatAutocompleteModule,
		MatMenuModule,
		MatTableModule,
		MatSlideToggleModule,
		DragDropModule,
		ScrollingModule,
		FormsModule,
		ReactiveFormsModule,
		ColorPickerModule
	],
	entryComponents: [],
	providers: [
		{provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 3000, verticalPosition: "top"}},
		{provide: MatPaginatorIntl, useClass: MyMatPaginatorIntl}
	],
	bootstrap: [AppComponent]
})
export class AppModule {}
