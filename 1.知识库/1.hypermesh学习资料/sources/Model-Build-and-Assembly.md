---
title: Model Build and Assembly
source: C:\Users\33536\Desktop\llm_kb\hypermesh学习资料\HyperMesh_2025.1_模型建立与装配教程.pdf
publishedDate: D:20261113091910+00'00'
sourceType: localPdf
---

Model Build and Assembly
Tutorial Level: Beginner
In this tutorial, you will build and assemble a rails model from CAD to connected FE.
Before you begin, copy the file(s) used in this tutorial to your working directory.
1A.zip
In this tutorial, you will:
Import the PLMXML file
Load and create representations
Load connectors
Create part sets
Create configurations
Realize connectors
Renumber nodes and elements, run the Model Checker, and export the solver deck
Work with libraries
Step 1. Load and Create Representations
1. Start HyperMesh with the OptiStruct user profile.
2. From the menu bar, click File > (and then) Import > (and then) BOM.
3. Browse to your working directory, select BOM_input.xml, and click Open.
4. In the BOM Import Options dialog, click Import.
The Part Browser opens and part assemblies/parts are imported into the session.
5. In the Part Browser, right-click a column name and select the following check boxes:
PDM PID
PDM MID
PDM Material
PDM Thickness
PDM MeshFlag
These columns show the PDM metadata that is parsed upon importation of the PLMXML file. This information is
also shown in the Entity Editor, under PDM Data.
6. Right-click the Frame_Assembly_000495 part and select Representations > (and then) Load > (and
then) from Session from the context menu.
7. In the Change Representation dialog, select CAD and click OK.
All available CAD representations are imported into the session.
Figure 1.
8. Right-click the Frame_Assembly_000495 part and select Representations > (and then) Create from the context
menu.

9. In the Change Representation dialog, select Common, Durability 5mm, and NVH 10mm and click OK.
Available CAD representations are sent to BatchMesher for processing.
10. In the BatchMesher dialog, click Yes to load new representations.
Figure 2.
11. Right-click on Frame_Assembly_000495 and select Representations > (and then) Load > (and then) from
Library from the context menu.
12. In the Change Representation dialog, select NVH 10mm and click OK.
13. Check the model to see components and properties with correct IDs and thicknesses are created and assigned
and match the PDM attributes.
Step 2. Load Connectors
1. From the Part Browser, right-click the Connectors_000481 part and select Representations > (and then) Load
> (and then) from Session from the context menu.
2. In the Change Representation dialog, select Connector and click OK.
Connector groups containing connectors are loaded into their corresponding parts.
Figure 3.
Step 3. Create Part Sets
1. From the Part Browser, click 	and select 	.
2. In the Part Sets view of the Part Browser, right-click and select Create > (and then) Part Set from the context
menu.
3. In the Entity Editor, enter Var1 as the name.
4. Repeat steps 2 and 3 to create a second part set named Var2 .

5. Group the following parts by dragging-and-dropping them from the Part view to the corresponding set.
Part Set 	Parts
Var1 	CenterInner_A_000428_Safety
CenterOuter_A_000429_Safety
Var2 	CenterInner_var2_A_000431_Safety
CenterOuter_var2_A_000432_Safety
Figure 4.
Step 4. Create Configurations
1. From the Part Browser, click 	and select 	.
2. In the Configurations view, right-click and select Create > (and then) Configuration from the context menu.
3. In the Entity Editor, enter Var1 as the name.
4. Repeat steps 2 and 3 to create a second configuration named Var2 .
5. Group the following part sets by dragging-and-dropping them from the Part Set view to the corresponding
configuration.
Part Set 	Configuration
Var1 	Var1
Var2 	Var2
6. Select the Active check box for the Var 2 configuration.
Figure 5.
All the parts, part assemblies, components, and part sets not associated with Var2 become inactive.
Step 5. Realize Connectors
1. From the Connectors ribbon, select the Controls tool.
Figure 6.
2. In the Connector Control Manager dialog, click 	.
3. Browse to your working directory, select the controller_defaults.hm file, and click Open.
Default connector control settings saved to an .hm file mean consistency of realizations across users.
4. From the entity selector in the modeling window, select Connectors.
5. In the modeling window, select all connectors in the modeling window.
Tip:
You can press Ctrl > (and then) A to quickly select all.
6. Right-click in the modeling window, select Edit point connectors from the context menu.
7. From the guide bar, select ACM (General). from the drop-down and click 	.

8. In the Part Browser, review the new parts that have been created to house the realizations.
Figure 7.
Step 6. Export Solver Deck
In this step, you will renumber nodes and elements, run the Model Checker, and export the solver deck.
1. From the Assembly ribbon, select the ID Manager tool.
Figure 8.
2. In the ID Manager dialog, select Component, Area properties, Volume properties, and Material.
3. Right-click the selected items and select Exclude > (and then) Exclude Only from the context menu.
4. Select and right-click Main Model and select Edit from the context menu.
5. In the Edit dialog, enter 1000000 for Minimum ID and 1500000 for Maximum ID.
Figure 9.
6. Click OK.
7. Select and right-click Main Model and select Renumber > (and then) Overflow from the context menu to
renumber the model into the defined range.
8. From the Validate ribbon, select the Manage Checks tool from the Model tool group.
Figure 10.
9. From the Model Checker, select and right-click ERROR and select Run from the context menu.
10. Verify the model is error free.
Tip:
View the Status Bar for additional messages.
11. From the menu bar, select File > (and then) Export > (and then) Solver Deck.
12. Save the solver deck as frame_var2_assembled.fem and click Export.
Export of parts is controlled via the write comments for Parts option and are saved to the solver deck via an xml
comment block.
Step 7. Optional: Work with Libraries
A default Part Library is generated and is located at <user/AltairLibraries/version>. You can register and connect
to new libraries of your choice.
1. From the Assembly ribbon, select the Libraries tool.
Figure 11.
The Library Manager dialog opens.
2. Register a new library.
a. Click 	.
b. Enter a Library name and Library path.
c. Click Add.
3. To delete a registered library, select the desired library and click 	.
4. To connect a library, select a disconnected library and click Connect.

5. To disconnect a library, select a connected library and click Disconnect.