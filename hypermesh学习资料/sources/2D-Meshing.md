---
title: 2D Meshing
source: C:\Users\33536\Desktop\llm_kb\hypermesh学习资料\HyperMesh_2025.1_2D网格教程.pdf
publishedDate: D:20261113091625+00'00'
sourceType: localPdf
---

2D Meshing
Tutorial Level: Beginner
In this tutorial, you will create, adjust, and edit mesh.
Before you begin, copy the file(s) used in this tutorial to your working directory.
BracketLeg_Start.hm
crash_2mm.criteria
crash_2mm.param
In this tutorial you will:
Create an initial mesh
Adjust the mesh
Edit the mesh
Step 1. Create Mesh
In this step, you will create and inspect the initial mesh.
1. Start HyperMesh.
2. From the menu bar, click File > (and then) Open > (and then) HyperMesh Model.
3. Browse to your working directory, select BracketLeg_Start.hm, and click Open.
The model opens in the modeling window.
4. From the Topology ribbon, select the Edit Parameters tool.
Figure 1.
5. In the Parameter Editor dialog, click 	and browse and open the crash_2mm.param file.
6. Click Apply and close the Parameter Editor dialog.
7. From the Topology ribbon, select the Edit Criteria tool.
Figure 2.
8. In the Criteria Editor dialog, click 	and browse and open the crash_2mm.criteria file.
9. Click Apply and close the Criteria Editor dialog.
10. From the 2D ribbon, select the Freeform > (and then) Create tool.
Figure 3.
11. In the modeling window, select all displayed surfaces.
12. From the guide bar, click .
13. For Element size, enter 2.5 .
Figure 4.
14. From the guide bar, click Mesh.

Step 2. Adjust Mesh
1. If necessary, select the General 2D Mesh > (and then) Density tool from the 2D ribbon.
Figure 5.
2. Set the density of the edges shown in Figure 6 to 12.
a. Hover over an edge with a density of 12 and press Ctrl > (and then) C to copy its settings.
b. Hover over an edge you wish to change and press Ctrl > (and then) V to paste the settings.
c. If necessary, select Update from the guide bar.
Figure 6.
Tip:
From the guide bar, click and select Auto update to automatically update the mapped surface.
3. Select the Freeform > (and then) Edit Faces tool from the 2D ribbon.
Figure 7.
4. In the modeling window, select the two surfaces highlighted in Figure 8.
Figure 8.
5. In the microdialog, set Element type to Quads only.
6. Select the Map Type tab, and verify Map as is set to Rectangle.
7. From the Topology ribbon, select the Split > (and then) Interactive tool.
Figure 9.
8. Left-click and drag to create a line to split the surface.
Figure 10.
9. Left-click to create two fixed points.
Figure 11.
10. From the 2D ribbon, select the Freeform > (and then) Create tool.
Figure 12.
11. In the modeling window, select the two surfaces and click Mesh from the guide bar or microdialog.
Figure 13.
12. If necessary, select the Freeform > (and then) Density tool from the 2D ribbon.
Figure 14.
13. Set the edges density as shown in Figure 15.
Figure 15.

14. Select the Freeform > (and then) Edit Faces tool from the 2D ribbon.
Figure 16.
15. In the modeling window, select the right part.
16. In the microdialog, verify Element type is set to Quads only.
17. Select the Map Type tab, and set Map as to Triangle.
18. Exit the tool.
Step 3. Edit Mesh
1. From the Topology ribbon, select the Split > (and then) Interactive tool.
Figure 17.
2. Left-click and drag to create lines to split the surface as shown in Figure 18.
Figure 18.
3. From the 2D ribbon, select the Freeform > (and then) Create tool.
Figure 19.
4. In the modeling window, select the four surfaces and click Mesh from the guide bar or microdialog.
Figure 20.
5. If necessary, select the Freeform > (and then) Density tool from the 2D ribbon.
Figure 21.
6. Set the edges density as shown in Figure 22.
Figure 22.
Note:
Your edge density may be slightly different. Adjust the edge density to obtain a regular mesh as
shown in the images.
7. Select the Freeform > (and then) Edit Faces tool from the 2D ribbon.
Figure 23.
8. In the modeling window, select the surfaces highlighted in Figure 24.
Figure 24.
9. In the microdialog, verify Element type is set to Quads only.
10. Select the Map Type tab, and verify Map as is set to Rectangle.
11. In the modeling window, select the surface shown in Figure 25.
Figure 25.
12. In the microdialog, verify Element type is set to Quads only.
13. Select the Map Type tab, and set Map as to Triangle.

14. Exit the tool.