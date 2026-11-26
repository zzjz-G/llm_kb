---
title: Tetra Meshing
source: C:\Users\33536\Desktop\llm_kb\hypermesh学习资料\HyperMesh_2025.1_四面体网格教程.pdf
publishedDate: D:20261113092106+00'00'
sourceType: localPdf
---

Tetra Meshing
Tutorial Level: Intermediate
In this tutorial, you will learn to create tetra meshes using several different methods and tools.
Before you begin, copy the file(s) used in this tutorial to your working directory.
VOLUME-TETRA-MESH.hm
In this tutorial you will:
Fix the topology of a model to allow for tetra meshing
Create a tetra mesh
Create a tetra mesh using proximity and curvature settings
Perform defeaturing operations to improve the quality of a tetra mesh
Recreate the tetra mesh after defeaturing
Create a tetra mesh using a shell mesh as an input
Use representation controls to create a tetra mesh.
Detect features for Mesh Controls
Create a tetra mesh using Mesh Controls
Step 1. Fix Topology
In this step, you will open the model and fix its topology to allow for tetra meshing.
1. Start HyperMesh.
2. From the menu bar, click File > (and then) Open > (and then) HyperMesh Model.
3. Browse to your working directory, select VOLUME-TETRA-MESH.hm, and click Open.
The model opens in the modeling window.
Figure 1.

4. From the 2D ribbon, select the Surface Repair > (and then) Validate tool.
Figure 2.
The model is displayed with its edges highlighted in green (closed edges) and red (free edges).
Figure 3.
Note:
The edges highlighted in red represent free edges, while those highlighted in green represent closed
edges.
5. From the guide bar, click 	.
6. Under Free edges, set Stitch Tolerance to 0.1 .
7. Select all surfaces using Ctrl > (and then) A and click Find on the guide bar.
8. From the guide bar, click to fix the identified problems.
The legend now shows that there are three Free edges remaining.
Figure 4.
9. From the 2D ribbon, select the Surface Repair > (and then) Edges tool.
Figure 5.
10. From the guide bar, click and to navigate between the remaining free edges.
11. From the microdialog, click and click on the edge shown in Figure 6 to patch it.
Figure 6.
12. From the microdialog, click and select .
13. Set the Tolerance to 0.5 and click on the next highlighted free edge shown in Figure 7 to fix it.
Figure 7.

14. Click on the last highlighted free edge shown in Figure 8 to stitch it.
Figure 8.
All edges are now highlighted in green.
Figure 9.
15. From the 2D ribbon, select the Surface Repair > (and then) Closed Shells tool.
Figure 10.
16. From the guide bar, click to create the solid geometry.
Figure 11.
Step 2. Create Tetra Mesh
In this step, you will create and review a tetra mesh.
1. From the 3D ribbon, select the Tet > (and then) Create tool.
Figure 12.
2. From the guide bar, select Solids from the drop-down menu.
3. In the modeling window, select the model.
4. From the guide bar, click 	and set Average size to 4 .
5. Set Element order to Second.
6. Verify that Advanced > (and then) Mesh destination is set to Original component.
7. From the guide bar, click Mesh.
Figure 13.
8. From the view controls toolbar, click 	> (and then) to set the geometry to wireframe mode.
9. Review the tetra mesh to identify areas for improvement.
Tip:
From the view controls toolbar, click 	> (and then) to display shaded geometry with surface edges to
assist in identifying areas in need of improvement.
You can also click to only display Elements. This can also be helpful in reviewing the tetra mesh to
identify areas of improvement.
Figure 14.
As seen in Figure 14, some areas of the tetra mesh still need fine-tuning.

10. Delete elements.
a. From the Entity selector, select Elements.
b. Select all elements.
c. Right-click and select Delete from the context menu.
Step 3. Create Tetra Mesh Using Proximity and Curvature
In this step, you will create a tetra mesh using proximity and curvature settings.
1. Use the right-click context menu to delete the previously created elements.
2. From the 3D ribbon, select the Tet > (and then) Create tool.
Figure 15.
3. From the guide bar, select Solids from the drop-down menu.
4. From the modeling window, click the model to select it.
5. From the guide bar, click 	and set Average size to 4 .
6. Set Element order to Second.
7. Select the Use proximity and Curvature based refinement check boxes.
8. Set Minimum size factor to 0.2 and set Feature angle to 30 .
9. Verify that Grow rate is set to 1.3 .
10. From the guide bar, click Mesh.
11. Review the tetra mesh that was created.
Note:
Some areas need a topology defeaturing to produce a better mesh.
Figure 16.
Step 4. Perform Defeaturing Operations to Improve Tetra Mesh
In this step, you will use defeaturing operations to improve the quality of the tetra mesh.
1. Use the right-click context menu to delete the previously created elements.
2. From the Topology ribbon, select the Defeature > (and then) Fillets tool.
Figure 17.
3. From the guide bar, click 	.
4. Set Minimum to 0.001 and Maximum to 1 to identify only the fillet around the top hole.
5. On the guide bar, click Find.
6. On the guide bar, click Remove All.
7. From the Topology ribbon, select the Split > (and then) Interactive tool.

8. Split the fillets as shown in Figure 18 by clicking and dragging on the surface of the model.
Figure 18.
9. Repeat for the other side.
10. From the Topology ribbon, select the Suppress tool from the Stitch tool group.
Figure 19.
11. Suppress the edges as shown in Figure 20 by clicking on them.
Figure 20.
12. Repeat for the other side of the model.
13. Inspect the model and suppress unnecessary shared edges as shown in Figure 21.
Figure 21.
Step 5. Recreate Tetra Mesh After Defeaturing
In this step, you will create an improved tetra mesh from the defeatured model.
1. From the 3D ribbon, select the Tet > (and then) Create tool.
Figure 22.
2. From the guide bar, select Solids from the drop-down menu.
3. From the guide bar, click 	and set Average size to 4 .
4. Set Element order to Second.
5. Select the Use proximity and Curvature based refinement check boxes.
6. Set Minimum size factor to 0.2 and set Feature angle to 30 .
7. Select the Layered tetra check box and verify Number of layers is set to 2 .
8. From the guide bar, click Mesh.
Figure 23.
Step 6. Create Tetra Mesh Using Shell Mesh as Input
1. Delete the displayed elements.
2. From the 2D ribbon, click next to the BatchMesher tool and select the Freeform tool from the drop-down menu.
The Create tool is selected by default from the Freeform sub-ribbon.
Figure 24.

3. Select the surfaces shown in Figure 25.
Figure 25.
4. From the guide bar, click 	.
a. Set Element size to 0.5 .
b. Set Element type to R-Trias.
c. Set Element order to First.
5. From the guide bar, click Mesh.
6. From the 2D ribbon, use the Freeform > (and then) Density tool to adjust the density if necessary.
Figure 26.
Figure 27.
7. Close the tool and examine the shell mesh just created.
8. Repeat on the other side of the model.
9. From the 2D ribbon, select the Freeform > (and then) Create tool.
Figure 28.
10. Select the surfaces shown in Figure 29 and Figure 30.
Figure 29.
Figure 30.
11. From the guide bar, click 	.
a. Set Element size to 1 .
b. Set Element type to R-Trias.
c. Set Element order to First.
12. From the guide bar, click Mesh.
13. From the 2D ribbon, use the Freeform > (and then) Density tool to check the density.
Figure 31.
14. From the 3D ribbon, select the Tet > (and then) Create tool.
Figure 32.
15. From the modeling window, select the solid.
16. From the guide bar, click 	.
a. Set Average size to 4 .
b. Set Element order to First.
c. Verify that the Retain existing surface mesh check box is selected.
d. Select the Use proximity and Curvature based refinement check boxes.
e. Set Minimum size factor to 0.2 and set Feature angle to 30 .
f. Select the Layered tetra check box and verify Number of layers is set to 2 .

17. From the guide bar, click Mesh and exit the tool.
18. Delete skin elements.
Note:
In the case of this tutorial, the skin elements are being removed because the skin/surface elements were
only required to define the volume and generate the solid elements. In some cases, like stress transfer,
the skin elements are needed.
a. From the Model Browser, select Elements > (and then) 3D > (and then) Tetra10 > (and then) CTETRA10.
b. Right-click CTETRA10 and select Delete from the context menu.
19. From the view controls toolbar, click and set it to display Elements only.
20. Review the final mesh.
Step 7. Create Tetra Mesh with Representation Controls
In this step, you will use representation controls to create a tetra mesh.
1. Create CAD representation.
a. From the Part Browser, right-click the engine mount and select Representations > (and then) Save from
the context menu.
b. For Representation, select CAD.
c. Verify Save to Library is not selected.
d. Click OK.
2. From the Assembly ribbon, select the Controls tool.
Figure 33.
The Representation Control Manager opens.
3. Click to add a new representation control.
4. For Type, select Tetra.
5. For Representation, enter Tetra_tutorial .
6. For Mesh flag, enter SMT .
7. For Average element size, enter 2 .
8. For Element order, select Second.
9. Select Use number of layers.
10. For Number of layers, enter 4 .
11. Click OK.
Figure 34.
12. From the Part Browser, right-click the engine mount and select Representations > (and then) Create from the
context menu.
The Change Representation dialog opens.
13. Select the Tetra_tutorial representation control and click OK.
Figure 35.
Step 8. Detect Features for Mesh Controls

1. Delete the displayed elements.
2. From the Topology ribbon, select the Features tool.
3. In the Feature Detection Parameters dialog, define parameters.
a. Select only the Holes 3D and Fillets boxes, as shown in Figure 36.
b. Set the Minimum Radius for Fillets to 1 and Maximum Radius to 5
c. Click Find.
Figure 36.
4. From the View Controls toolbar, click and select Features.
5. Review the selected features in the Features Browser.
6. From the Topology ribbon, select the Mesh Controls tool.
Figure 37.
7. In the Mesh Controls Browser, clear the Local, Model, and Refinement mesh controls check boxes to disable
them.
8. Create a cylinder feature mesh control.
a. In the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Feature > (and
then) Cylinder.
b. From the Entity Selection area of the Entity Editor, select the Entities field and click to open the Select
Surfaces dialog.
c. From the Select Surfaces dialog, select the model's holes, as shown in Figure 38, and click OK.
Figure 38.
d. From the Mesh Size section of the Entity Editor, set Axial Mesh Size to 1 and Divisions to 20 .
9. Create a fillet mesh control.
a. From the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Feature >
(and then) Fillet.
b. From the Entity Selection area of the Entity Editor, select the Entities field and click .
c. From the Select Surfaces window, select the model's fillets, as shown in Figure 39, and click OK.
Figure 39.
d. From the Axial Mesh Size section of the Entity Editor, set Length Along Fillet to 1 .
e. From the Geometry Curvature section of the Entity Editor, set Specification to Number.
f. Set Number of Elements to 4 .

10. Create a body feature mesh control.
a. From the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Feature >
(and then) Body.
b. From the Entity Selection area of the Entity Editor, click Entities and, in the modeling window, select the
engine mount component.
Figure 40.
c. From the Mesh Settings section of the Entity Editor, verify Average Element Size is set to 4 .
d. From the Mesh Settings section of the Entity Editor, verify Minimum Element Size is set to 0.4 .
11. Create a washer feature mesh control.
a. From the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Feature >
(and then) Washer.
b. From the Entity Selection section of the Entity Editor, set Entities to the highlighted lines shown in Figure
41.
Figure 41.
c. From the Washer Parameters section of the Entity Editor, verify Creation Method is set to Washer Width.
d. From the Washer Parameters section of the Entity Editor, verify Width is set to 1 .
e. Set Number of Layers to 2 .
12. From the Mesh Controls Browser, right-click on Feature and select Mesh.
13. Review the surface mesh that was created.
Figure 42.
14. From the Mesh Controls Browser, right-click on Volume Mesh and select Mesh.
15. Delete the shell elements that were created before (CTRIA3).
Step 9. Create Tetra Mesh With Mesh Controls
In this step, you will use mesh controls to create a tetra mesh.
1. From the View Controls toolbar, click and enable Geometry view again.
2. Use the right-click context menu to delete the previously created elements.
3. From the Topology ribbon, select the Mesh Controls tool.
4. Create a model mesh control.
a. In the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Model > (and
then) Surface Deviation > (and then) Surfaces.
b. In the Entity Selection area of the Entity Editor, click Entities and select all surfaces of the model in the
modeling window or press Ctrl > (and then) A.
c. In the Mesh Mode area of the Entity Editor, verify Mode is set to Surface Deviation.
d. In the Main section of the Entity Editor, set Minimum Size to 0.8 and Maximum Size to 10 .
e. Set Element Type to Trias.

5. Create a local mesh control.
a. From the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Local >
(and then) Size and Bias > (and then) Surfaces.
b. In the Entity Selection area of the Entity Editor, click Entities and select only the top surface of the model in
the modeling window as shown in Figure 43.
Figure 43.
c. In the Main section of the Entity Editor, set Element size to 0.8 .
d. Set Element Type to Trias.
6. Create an angle-based refinement mesh control.
a. From the Mesh Controls Browser, right-click on Surface Mesh and select Create > (and then) Refinement
> (and then) Angle-based.
b. In the Entity Selection area of the Entity Editor, click Entities and select all surfaces of the model in the
modeling window or press Ctrl > (and then) A.
c. In the Refinement section of the Entity Editor, verify Direction is set to Convex.
d. In the Refinement section of the Entity Editor, set Minimum Angle Limit to 30 and Maximum Angle Limit to
180 .
e. Set Refinement Size for Minimum Angle Limit and Maximum Angle Limit to 1 .
7. Create a volume mesh control.
a. From the Mesh Controls Browser, right-click on Volume Mesh and select Create > (and then) Model >
(and then) Tetra.
b. From the Entity Selection section of the Entity Editor, set Entities to the engine mount component of the
model.
Figure 44.
c. From the Core Mesher section, of the Entity Editor verify Core Mesh is set to Tetra Mesh.
d. From the Tetra Mesh section of the Entity Editor, set Element Size Limits to Average Size.
e. Verify Average Element Size is set to 4 .
f. Select the Use Number of Layers check box.
g. Verify Number of Layers is set to 2 .
h. In the Advanced section of the Entity Editor, select Original Component for Volume Mesh Organization.
8. From the Mesh Controls Browser, right-click on Surface Mesh and select Mesh.
9. From the Mesh Controls Browser, right-click on Volume Mesh and select Mesh.
10. Delete the previously created shell mesh (CTRIA3) and review the mesh.
Figure 45.