---
title: Geometry Cleanup
source: C:\Users\33536\Desktop\llm_kb\hypermesh学习资料\HyperMesh_2025.1_几何清理教程.pdf
publishedDate: D:20261113091802+00'00'
sourceType: localPdf
---

Geometry Cleanup
Tutorial Level: Beginner
In this tutorial, you will learn how to cleanup geometry and conduct midsurfacing.
Before you begin, copy the file(s) used in this tutorial to your working directory.
Surface-Repair.hm
In this tutorial you will:
Evaluate the integrity of a model
Use the Surface repair to find, review, and fix any geometric errors in the model surfaces
Identify issues
Remove free edges
Create closed shell
Step 1. Evaluate Model Integrity
In this step, you will evaluate the model integrity using the View Controls toolbar.
1. Start HyperMesh.
2. From the menu bar, click File > (and then) Open > (and then) HyperMesh Model.
3. Browse to your working directory, select Surface-Repair.hm, and click Open.
The model opens in the modeling window.
4. From the View Controls toolbar, click 	and select Topology.
5. Zoom, pan, and rotate the model to evaluate the model integrity.
Figure 1.
Step 2. Find, Review, and Fix Geometric Errors
In this step, you will use the Surface Repair tool to find, review, and fix any geometric errors in the models
surface.
1. From the 2D ribbon, select the Surface Repair > (and then) Validate tool.
Figure 2.

2. From the guide bar, click 	to define which errors to check for.
a. In the Free edges section, select the Optimize surface quality check box.
b. In the Slivers section, enter 0.20 for Size<.
Figure 3.
3. In the modeling window, select all surfaces.
4. From the guide bar, click Find.
5. In the modeling window, review the legend.
Figure 4.
Step 3. Identify Issues
From the guide bar of the Validate tool, click 	to automatically fix the issues based on the selected checks,
methods, and tolerances.
The legend updates and describes the types of errors still contained in the model.
To review and fix specific error types, you can do one of the following:
Select the associated tool from the secondary toolset.
From the legend, click the error type.
Step 4. Remove Free Edges
1. From the 2D ribbon, select the Surface Repair > (and then) Edges tool.
Figure 5.
2. Use the arrows on the guide bar to navigate between issues.
Figure 6.
Figure 7.
3. Optional: While in navigation mode, right-click in the modeling window and select or deselect adjacent
surfaces from the context menu.
4. From the microdialog, click 	.
5. In the modeling window, select each edge to be patched.
Figure 8.
6. From the microdialog, click Fix.

Step 5. Create Closed Shell
1. From the 2D ribbon, select the Surface Repair > (and then) Closed Shells tool.
Figure 9.
Note:
You can also open the Closed Shells tool by selecting Closed Shells from the legend.
Figure 10.
2. From the guide bar, click 	to convert bonding surfaces to a solid.
3. Exit the Closed Shells tool and verify proper creation of the solid.
Figure 11.
Tip:
If the Surface Repair tools can not fix any error checks, isolate the error checks and fix them using the Edit
Geometry tools.