import {NgModule} from "@angular/core";
import {Routes, RouterModule} from "@angular/router";
import {paths} from "./app.common";
import {DrawCadComponent} from "@components/draw-cad/draw-cad.component";
import {PageNotFoundComponent} from "./components/page-not-found/page-not-found.component";
import {PathResolveService} from "./services/path-resolve.service";
import {EditCadComponent} from "@components/edit-cad/edit-cad.component";
import {PrintCadComponent} from "@components/print-cad/print-cad.component";
import {IndexComponent} from "./components/index/index.component";

const routes: Routes = [
	{path: "", pathMatch: "full", redirectTo: paths.index},
	{path: paths.index, component: IndexComponent},
	{path: paths["draw-cad"], component: DrawCadComponent},
	{path: paths["edit-cad"], component: EditCadComponent},
	{path: paths["print-cad"], component: PrintCadComponent},
	{path: "**", component: PageNotFoundComponent, resolve: {redirect: PathResolveService}}
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule]
})
export class AppRoutingModule {}
