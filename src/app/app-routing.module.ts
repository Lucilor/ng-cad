import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {paths} from "./app.common";
import {DrawCadComponent} from "./draw-cad/draw-cad.component";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {PathResolveService} from "./path-resolve.service";
import {IndexComponent} from "./index/index.component";
import {EditCadComponent} from "./edit-cad/edit-cad.component";

const routes: Routes = [
	{path: "", component: IndexComponent},
	{path: paths["draw-cad"], component: DrawCadComponent},
	{path: paths["edit-cad"], component: EditCadComponent},
	{path: "**", component: PageNotFoundComponent, resolve: {path: PathResolveService}}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule {}
