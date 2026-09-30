/* ============================================================================
   VENTO DASHBOARD — data.js
   Responsable de:
     - Parsear archivos CSV (formato de la base de Vento).
     - Normalizar los datos a una estructura interna consistente, sin
       importar pequeñas diferencias entre canales (columnas faltantes,
       nombres con espacios extra, números como texto, etc.).
     - Detectar dinámicamente las columnas de "semana" (37, 38, 39, 40, 41...)
       y las de "Inventario Proyectado Por Semana" cuando existan.
     - Exponer los datos normalizados en `window.APP_DATA`.

   IMPORTANTE: esta capa NUNCA modifica los valores originales de la base;
   sólo los convierte a tipos utilizables (número, texto limpio) y les agrega
   campos calculados adicionales (ver calculations.js).
   ============================================================================ */

/* ----------------------------------------------------------------------
   1) BASE POR DEFECTO (embebida)
   Se incluye el contenido crudo de base.csv tal como fue entregado, para
   que el dashboard funcione de inmediato al abrir dashboard.html sin
   depender de que el usuario suba un archivo.
   ---------------------------------------------------------------------- */
const DEFAULT_CSV_TEXT = `
Unidad de Negocio,Modelo Planeación,Modelo Agrupado,FC Septiembre,Inventario Total Proyectado,% Asignacion,Inv Asignado,Cumplimiento de Inv,60.3,17.7,17.4,Inventario Gnrl.,Ventas,Pro Venta Mensual,PVD,DOH,Programado (Logística),Motos en Recepción Pendiente,Traslado Completado,Requerimiento,Diferencia,Pedido Revisado,Pendiente por entregar,% Cumplimiento de Entrega,% Cumplimiento FC,Desviacion FC,DOH Proyectado,Comentarios,Inventario Proyectado 36,Inventario Proyectado 37,Inventario Proyectado 38,Inventario Proyectado 39,Inventario Proyectado 40,36,37,38,39,40,ESTATUS
DISTRIBUIDORES,Alpina 300,Alpina,41,407,0.054511278,22.18609023,0.541124152,0,0,33,33,237,33.85714286,1.110070258,29.7278481,0,0,8,8,14.18609023,8,0,1,0.195121951,8,36.93459916,Sin arribos en septiembre ,8,0,0,0,,8,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Atom 170 2.0,Atom,48,4514,0.08,361.12,7.523333333,0,0,22,22,387,55.28571429,1.81264637,12.1369509,0,0,0,48,313.12,48,48,0,0,26,38.61757106,0,32,16,0,0,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Axus 170,Axus,60,6591,0.024577046,161.9873114,2.699788523,0,0,63,63,403,57.57142857,1.887587822,33.37593052,0,0,0,0,161.9873114,0,0,0,0,-3,33.37593052,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Blast 125,Blast,0,1126,0,0,0,0,0,0,0,105,15,0.491803279,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Bristol N400,Bristol,0,771,0.096685083,74.5441989,0,0,0,1,1,25,3.571428571,0.117096019,8.54,0,0,0,0,74.5441989,0,0,0,0,-1,8.54,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Bristol N400 ABS,Bristol ABS,15,313,0,0,0,0,0,11,11,2,0.285714286,0.009367681,1174.25,0,0,18,15,-15,15,-3,1.2,1.2,4,2775.5,Sin arribos en septiembre Para cubrir hasta Octubre,15,0,0,0,,18,0,0,0,0,ENTREGADO
DISTRIBUIDORES,California R300,California ABS,0,1185,0.032905561,38.99308983,0,0,0,0,0,15,2.142857143,0.070257611,0,0,0,0,0,38.99308983,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,California R300 ABS,California ABS,30,1185,0,0,0,0,0,29,29,15,2.142857143,0.070257611,412.7666667,0,0,1,20,-20,1,0,1,0.033333333,1,427,0,1,0,0,0,,1,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Colt 300,Colt 300,59,1467,0.103214124,151.41512,2.566357965,0,0,14,14,157,22.42857143,0.735362998,19.03821656,0,0,0,25,126.41512,20,20,0,0,45,46.23566879,0,0,20,0,0,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Corsel 300,Corsel 300,0,327,0,0,0,0,0,3,3,42,6,0.196721311,15.25,0,0,5,0,0,0,-5,0,0,-3,15.25,0,0,0,0,0,,0,5,0,0,0,ENTREGADO
DISTRIBUIDORES,Corsel 300,Corsel 300,0,4687,0,0,0,0,0,3,3,42,6,0.196721311,15.25,0,0,5,15,-15,15,10,0.333333333,0,-3,91.5,,5,,,,,0,5,0,0,0,PENDIENTE
DISTRIBUIDORES,Cougar 250,Cougar 250,45,957,0.073442623,70.28459016,1.561879781,0,0,66,66,251,35.85714286,1.175644028,56.13944223,0,0,0,0,70.28459016,0,0,0,0,-21,56.13944223,No se retiran del Inventario para cubrir desavasto y pueda aguantar a asignación de Octubre,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 170 Rojo,Crossmax 170,70,1094,0.072830579,79.67665289,1.138237898,0,0,94,94,401,57.28571429,1.878220141,50.04738155,0,0,0,0,79.67665289,0,0,0,0,-24,50.04738155,No se retiran del Inventario para cubrir desavasto y pueda aguantar a asignación de Octubre,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 220 Gris,Crossmax 220,0,0,0,0,0,0,0,3,3,1086,155.1428571,5.086651054,0.589779006,0,0,0,0,0,0,0,0,0,-3,0.589779006,,,,,,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 220 Led,Crossmax 220,204,5284,0.061197041,323.3651648,1.585123357,0,0,1,1,1086,155.1428571,5.086651054,0.196593002,20,0,184,204,119.3651648,204,20,0.901960784,0.901960784,203,40.30156538,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,103,0,21,80,,103,50,0,0,0,PENDIENTE
DISTRIBUIDORES,Crossmax 250 Led,Crossmax 250,92,2964,0.123476418,365.9841017,3.978088062,0,0,116,116,436,62.28571429,2.042154567,56.80275229,0,0,35,92,273.9841017,35,0,1,0.380434783,-24,73.94151376,DOH altos comparación a su venta. Se da seguimiento ya que su FC se cumple con su inventario,35,0,0,0,,35,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 330 Rally TRX Negro,Crossmax RALLY,199,5831,0.076673327,447.0821678,2.246644059,0,0,0,0,1259,179.8571429,5.896955504,0,60,0,159,199,248.0821678,199,40,0.798994975,0.798994975,199,33.74622716,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,0,199,0,0,,159,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Cyclone 210 Gris,Cyclone,56,3957,0.032636487,129.1425778,2.306117461,0,0,55,55,311,44.42857143,1.456674473,37.75723473,0,0,15,0,129.1425778,15,0,1,0.267857143,1,48.05466238,0,15,0,0,0,,15,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Dakar 330,Dakar,154,2283,0.113397818,258.8872196,1.681085842,0,0,13,13,419,59.85714286,1.962529274,6.624105012,40,0,66,154,104.8872196,154,88,0.428571429,0.428571429,141,85.09427208,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,66,0,88,0,,62,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Falkon 250 Z3,Falkon,89,3299,0.041167474,135.8114963,1.525971869,0,0,0,0,427,61,2,0,0,0,89,89,46.8114963,89,0,1,1,89,44.5,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,89,0,0,0,,89,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Gladiator 200 2.0,Gladiator,214,4056,0.080610397,326.955772,1.527830711,0,0,96,96,1131,161.5714286,5.297423888,18.12201592,0,0,150,100,226.955772,150,0,1,0.700934579,118,46.43766578,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,150,0,0,0,,150,0,0,0,0,ENTREGADO
DISTRIBUIDORES,GTS Pro 300,GTS PRO,23,38,0.04308094,1.637075718,0.071177205,0,0,0,0,161,23,0.754098361,0,0,0,0,0,1.637075718,0,0,0,0,23,0,Descontinuado,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,HIPSTER 170,Hipster,12,178,0.08,14.24,1.186666667,0,0,15,15,54,7.714285714,0.2529274,59.30555556,0,0,0,0,14.24,0,0,0,0,-3,59.30555556,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Hyper 310,Hyper,18,546,0,0,0,0,0,25,25,31,4.428571429,0.145199063,172.1774194,0,0,0,0,0,0,0,0,0,-7,172.1774194,Considerar Retirar 15 motos,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Intrepid 125 SX,Intrepid,69,3526,0.07,246.82,3.577101449,0,0,8,8,181,25.85714286,0.847775176,9.436464088,0,0,60,70,176.82,60,0,1,0.869565217,61,80.20994475,Se contempla desabasto mes de septiembre para llenado de Octubre,60,0,0,0,,60,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Lithium 190,Lithium,118,5398,0.031140769,168.097871,1.424558229,0,0,38,38,792,113.1428571,3.709601874,10.24368687,0,0,0,72,96.09787099,118,118,0,0,80,42.0530303,Habra cambio de cilindraje a 200 Favor de considerar,0,0,95,23,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,M1 - 200,M1,100,3487,0.04415011,153.9514349,1.539514349,0,0,99,99,224,32,1.049180328,94.359375,0,0,50,100,53.95143488,50,0,1,0.5,1,142.015625,0,50,0,0,0,,50,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Nitrox 250 T3,Nitrox 250,46,1014,0.054771178,55.53797468,1.207347276,0,0,90,90,204,29.14285714,0.955503513,94.19117647,0,0,0,0,55.53797468,0,0,0,0,-44,94.19117647,Considerar Retirar 15 motos,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Nitrox 300 T3,Nitrox 300,0,0,0.05,0,0,0,0,0,0,239,34.14285714,1.119437939,0,0,0,0,0,0,0,0,0,0,0,0,,,,,,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Nitrox 330,Nitrox 330,46,1184,0.054293918,64.28399896,1.397478238,0,0,0,0,126,18,0.590163934,0,0,0,12,52,12.28399896,36,24,0.333333333,0.260869565,46,61,No hay arribos se asigna conforme a participacion de canal,36,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Onyx 250,Onyx,66,2357,0.058792232,138.5732908,2.099595315,0,0,49,49,538,76.85714286,2.519906323,19.44516729,32,0,1,66,72.57329077,66,65,0.015151515,0.015151515,17,45.6366171,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,5,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Ovni 200,Ovni,49,4687,0.029756191,139.4672682,2.846270779,0,0,18,18,276,39.42857143,1.292740047,13.92391304,0,0,0,30,109.4672682,49,49,0,0,31,51.82789855,No se puede entregar todo para 1ro  se prorratea con llegadas.,0,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Ovni Track 170,Ovni Track,0,0,0,0,0,0,0,29,29,431,61.57142857,2.018735363,14.36542923,0,0,0,0,0,0,0,0,0,-29,14.36542923,,,,,,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ovni Track 200,Ovni Track,92,4431,0.069941843,309.9123049,3.368612009,0,0,34,34,431,61.57142857,2.018735363,16.84222738,0,0,92,26,283.9123049,92,0,1,1,58,62.41531323,0,92,0,0,0,,92,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Phantom 170 S,Phantom,0,1271,0.013204044,16.78233959,0,0,0,39,39,192,27.42857143,0.899297424,43.3671875,22,0,0,0,16.78233959,5,5,0,0,-39,48.92708333,Habra cambio de cilindraje a 200 Favor de considerar,5,0,0,0,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Rambler 125,Rambler,0,1966,0,0,0,0,0,0,0,78,11.14285714,0.365339578,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rambler 125 Negro,Rambler,0,0,0,0,0,0,0,0,0,78,11.14285714,0.365339578,0,0,0,0,0,0,0,0,0,0,0,0,,,,,,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rapid 125 RT,Rapid,0,819,0,0,0,0,0,5,5,102,14.57142857,0.477751756,10.46568627,0,0,0,0,0,0,0,0,0,-5,10.46568627,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Reptile Trek 200,Reptile Trek,40,5646,0.012076835,68.1858121,1.704645302,0,0,3,3,299,42.71428571,1.400468384,2.142140468,0,0,56,40,28.1858121,56,0,1,1.4,37,42.12876254,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,54,,,,,56,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rex 350,Rex 350,0,37,0,0,0,0,0,0,0,43,6.142857143,0.201405152,0,0,0,0,8,-8,0,0,0,0,0,0,Bajo asignacion,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rex 550,Rex 550,0,63,0,0,0,0,0,5,5,27,3.857142857,0.1264637,39.53703704,0,0,0,0,0,0,0,0,0,-5,39.53703704,Bajo asignacion,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rocketman 300 Platinum,Rocketman Racing,46,1995,0.01940891,38.72077636,0.841756008,0,0,31,31,191,27.28571429,0.894613583,34.65183246,0,0,15,46,-7.279223644,15,0,1,0.326086957,15,51.41884817,DOH ALTOS se monitorea para asignar mas,15,0,0,0,,15,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ruda 170 F4,Ruda,0,2498,0.018704566,46.72400555,0,0,0,33,33,335,47.85714286,1.569086651,21.03134328,0,0,20,35,11.72400555,20,0,1,0,-33,33.77761194,No hay proximas llegadas Revisar disponibilidad,20,0,0,0,,20,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ryder 190,Ryder,99,4390,0.030446007,133.657972,1.350080526,0,0,0,0,476,68,2.229508197,0,0,0,13,99,34.65797205,99,86,0.131313131,0.131313131,99,44.40441176,Habra cambio de cilindraje a 220 Favor de considerar,14,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Screamer 300 Gris,Screamer,26,346,0.066565041,23.03150407,0.885827079,0,0,9,9,72,10.28571429,0.337236534,26.6875,0,0,2,26,-2.968495935,5,3,0.4,0.076923077,17,41.51388889,0,5,0,0,0,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Screamer Sportivo 300 Azul,Screamer Sportivo,26,1254,0.050684237,63.55803345,2.444539748,0,0,12,12,175,25,0.819672131,14.64,0,0,26,26,37.55803345,26,0,1,1,14,46.36,0,26,0,0,0,,26,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Spectra 7i 125,Spectra,36,1792,0.061664954,110.5035971,3.069544365,0,0,60,60,298,42.57142857,1.395784543,42.98657718,0,0,0,0,110.5035971,0,0,0,0,-24,42.98657718,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Spirit 170,Spirit,22,4094,0.008365284,34.24747299,1.556703318,0,0,5,5,223,31.85714286,1.044496487,4.786995516,0,0,45,22,12.24747299,45,0,1,2.045454545,17,47.86995516,0,45,0,0,0,,45,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Storm 300 2.0,Storm,119,1808,0.088536813,160.0745573,1.345164347,0,0,73,73,454,64.85714286,2.1264637,34.32929515,20,0,33,46,114.0745573,46,13,0.717391304,0.277310924,46,55.96145374,0,53,,,,,1,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Streetrod Rojo 170,Streetrod,13,889,0.030124427,26.78061559,2.060047353,0,0,20,20,70,10,0.327868852,61,0,0,0,0,26.78061559,0,0,0,0,-7,61,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Terra 170 DS,Terra,46,2824,0.029642648,83.71083773,1.81980082,0,0,60,60,314,44.85714286,1.470725995,40.79617834,0,0,0,0,83.71083773,0,0,0,0,-14,40.79617834,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Thriller 250,Thriller,59,1017,0.135903614,138.2139759,2.342609761,0,0,3,3,260,37.14285714,1.217798595,2.463461538,0,0,0,59,79.2139759,50,50,0,0,56,43.52115385,No se puede entregar todo para 1ro  se prorratea con llegadas.,0,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Thunderstar 300 S,Thunderstar,69,947,0.072666149,68.81484355,0.997316573,0,0,78,78,315,45,1.475409836,52.86666667,0,0,69,0,68.81484355,69,0,1,1,-9,99.63333333,0,69,0,0,0,,69,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Tornado 300 Negro,Tornado,95,2925,0.053113815,155.3579098,1.635346419,0,0,96,96,372,53.14285714,1.742388759,55.09677419,0,0,10,0,155.3579098,10,0,1,0.105263158,-1,60.83602151,Se consideran 10 pocos arribos,10,0,0,0,,0,10,0,0,0,ENTREGADO
DISTRIBUIDORES,Workman 190,Workman 190,23,16,0.108919383,1.74271012,0.075770005,0,0,17,17,175,25,0.819672131,20.74,0,0,0,0,1.74271012,0,0,0,0,6,20.74,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Workman 250,Workman 250,46,26,0.107786467,2.802448147,0.060922786,0,0,0,0,238,34,1.114754098,0,0,0,0,46,-43.19755185,0,0,0,0,46,0,Arribos hasta octubre,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Xplor 190 Gris,Xplor,120,2255,0.073868149,166.5726767,1.388105639,0,0,19,19,355,50.71428571,1.662763466,11.42676056,0,0,0,60,106.5726767,0,0,0,0,101,11.42676056,Sin arribos,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Xpress Sport 170,Xpress,59,2661,0.030365719,80.80317695,1.369545372,0,0,111,111,579,82.71428571,2.711943794,40.93005181,0,0,92,0,80.80317695,92,0,1,1.559322034,-52,74.85405872,0,92,0,0,0,,92,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Yuma 250,Yuma 250,92,4687,0.105670902,495.2795166,5.383473006,0,0,0,0,574,82,2.68852459,0,29,0,53,120,375.2795166,130,77,0.407692308,0.576086957,92,48.35365854,0,10,,,,,10,24,0,0,0,PENDIENTE
E-COMMERCE,Alpina 300,Alpina,25,407,0.038131042,15.51933405,0.620773362,4,9,0,13,157,22.42857143,0.735362998,17.67834395,0,0,5,25,-9.480665951,5,0,1,0.2,12,24.47770701,Sin arribos programados hasta octubre.,5,,,,,5,0,0,0,0,ENTREGADO
E-COMMERCE,Atom 170 2.0,Atom,40,4514,0.03,135.42,3.3855,10,22,0,32,362,51.71428571,1.695550351,18.87292818,0,0,30,40,95.42,30,0,1,0.75,8,36.56629834,//,12,,,,,30,0,0,0,0,ENTREGADO
E-COMMERCE,Axus 170,Axus,27,6591,0.039780521,262.1934156,9.710867246,14,17,0,31,329,47,1.540983607,20.11702128,0,0,27,27,235.1934156,27,0,1,1,-4,37.63829787,//,6,,,,,27,0,0,0,0,ENTREGADO
E-COMMERCE,Blast 125,Blast,15,1126,0.033077377,37.24512699,2.483008466,6,5,0,11,143,20.42857143,0.669789227,16.42307692,0,0,15,15,22.24512699,15,0,1,1,4,38.81818182,//,8,,,,,15,0,0,0,0,ENTREGADO
E-COMMERCE,Bristol N400,Bristol,10,771,0.048342541,37.27209945,3.727209945,7,20,0,27,10,1.428571429,0.046838407,576.45,0,0,0,0,37.27209945,0,0,0,0,-17,576.45,Retirar 17 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,California R300,California,10,1187,0.011516946,13.67061533,1.367061533,1,1,0,2,5,0.714285714,0.023419204,85.4,0,0,0,0,13.67061533,0,0,0,0,8,85.4,//,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Colt 300,Colt 300,5,1467,0.013580806,19.9230421,3.98460842,0,17,0,17,68,9.714285714,0.318501171,53.375,0,0,0,15,4.9230421,15,15,0,0,-12,100.4705882,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Cougar 250,Cougar 250,30,957,0.078688525,75.30491803,2.510163934,7,28,0,35,143,20.42857143,0.669789227,52.25524476,0,0,0,30,45.30491803,0,0,0,0,-5,52.25524476,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 170 Rojo,Crossmax 170,15,1094,0.015495868,16.95247934,1.130165289,7,9,0,16,61,8.714285714,0.285714286,56,0,0,0,10,6.952479339,0,0,0,0,-1,56,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 220 Gris,Crossmax 220,0,0,0,0,0,3,1,0,4,464,66.28571429,2.173302108,1.840517241,0,0,0,0,0,0,0,0,0,-4,1.840517241,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 220 Led,Crossmax 220,85,5284,0.030860046,163.0644848,1.918405703,21,18,0,39,464,66.28571429,2.173302108,17.9450431,45,0,2,85,78.06448479,47,45,0.042553191,0.023529412,46,39.57112069,//,3,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Crossmax 220 Negro,Crossmax 220,0,0,0,0,0,1,0,0,1,464,66.28571429,2.173302108,0.46012931,0,0,0,0,0,0,0,0,0,-1,0.46012931,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 250 Led,Crossmax 250,20,2964,0.024642289,73.03974563,3.651987281,4,16,0,20,124,17.71428571,0.580796253,34.43548387,0,0,20,20,53.03974563,20,0,1,1,0,68.87096774,//,0,,,,,0,20,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 250 Rojo,Crossmax 250,0,0,0,0,0,7,0,0,7,124,17.71428571,0.580796253,12.05241935,0,0,0,0,0,0,0,0,0,-7,12.05241935,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 300 Rally,Crossmax RALLY,0,0,0,0,0,1,0,0,1,90,12.85714286,0.421545667,2.372222222,0,0,0,0,0,0,0,0,0,-1,2.372222222,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 300 Rally TRX Gris,Crossmax RALLY,0,0,0,0,0,8,13,0,21,90,12.85714286,0.421545667,49.81666667,0,0,0,0,0,0,0,0,0,-21,49.81666667,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 330 Rally TRX Negro,Crossmax RALLY,25,5831,0.013361638,77.91171329,3.116468531,4,25,0,29,90,12.85714286,0.421545667,68.79444444,0,0,0,0,77.91171329,0,0,0,0,-4,68.79444444,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Cyclone 210 Gris,Cyclone,40,3957,0.028575726,113.0741465,2.826853662,14,16,0,30,283,40.42857143,1.325526932,22.63250883,0,0,30,40,73.07414649,30,0,1,0.75,10,45.26501767,//,0,,,,,30,0,0,0,0,ENTREGADO
E-COMMERCE,Dakar 300,Dakar,0,0,0,0,0,1,0,0,1,150,21.42857143,0.702576112,1.423333333,0,0,0,0,0,0,0,0,0,-1,1.423333333,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Dakar 330,Dakar,20,2283,0.027783495,63.42971805,3.171485902,5,21,0,26,150,21.42857143,0.702576112,37.00666667,0,0,10,20,43.42971805,20,10,0.5,0.5,-6,65.47333333,,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Falkon 250 Z3,Falkon,25,3299,0.020902371,68.95692072,2.758276829,10,12,0,22,138,19.71428571,0.646370023,34.03623188,0,0,6,25,43.95692072,6,0,1,0.24,3,43.31884058,//,1,,,,,6,0,0,0,0,ENTREGADO
E-COMMERCE,Gladiator 200 2.0,Gladiator,68,4056,0.037934305,153.8615398,2.262669703,34,13,0,47,450,64.28571429,2.107728337,22.29888889,0,0,51,68,85.86153979,61,10,0.836065574,0.75,21,51.24,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,GTS Pro 300,GTS PRO,20,38,0.046997389,1.785900783,0.089295039,0,4,0,4,172,24.57142857,0.805620609,4.965116279,0,0,0,0,1.785900783,0,0,0,0,16,4.965116279,Modelo descontinuado.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,HIPSTER 170,Hipster,8,178,0.071755725,12.77251908,1.596564885,3,3,0,6,48,6.857142857,0.224824356,26.6875,0,0,3,8,4.772519084,3,0,1,0.375,2,40.03125,//,2,,,,,3,0,0,0,0,ENTREGADO
E-COMMERCE,Hyper 280,Hyper,0,0,0,0,0,1,1,0,2,25,3.571428571,0.117096019,17.08,0,0,0,0,0,0,0,0,0,-2,17.08,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Hyper 310,Hyper,5,546,0.050306748,27.46748466,5.493496933,3,8,0,11,25,3.571428571,0.117096019,93.94,0,0,0,5,22.46748466,0,0,0,0,-6,93.94,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Intrepid 125 SX,Intrepid,16,3526,0.03,105.78,6.61125,6,30,0,36,79,11.28571429,0.370023419,97.29113924,0,0,0,0,105.78,0,0,0,0,-20,97.29113924,Retirar 20 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Lithium 190,Lithium,80,5398,0.023196695,125.215761,1.565197013,60,3,0,63,489,69.85714286,2.290398126,27.50613497,0,0,0,20,105.215761,40,40,0,0,17,44.97034765,//,1,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,M1 - 200,M1,15,3487,0.015452539,53.88300221,3.592200147,0,11,0,11,88,12.57142857,0.412177986,26.6875,0,0,15,15,38.88300221,15,0,1,1,4,63.07954545,,4,,,,,15,0,0,0,0,ENTREGADO
E-COMMERCE,Nitrox 250 T3,Nitrox 250,25,1014,0.033592989,34.06329114,1.362531646,24,42,0,66,145,20.71428571,0.679156909,97.17931034,0,0,0,0,34.06329114,0,0,0,0,-41,97.17931034,Retirar 40 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Nitrox 300 T3,Nitrox 300,0,0,0.05,0,0,3,0,0,3,159,22.71428571,0.744730679,4.028301887,0,0,0,0,0,0,0,0,0,-3,4.028301887,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Nitrox 330,Nitrox 330,20,1184,0.053249804,63.04776821,3.15238841,3,9,0,12,0,0,0,0,0,0,15,20,43.04776821,15,0,1,0.75,8,0,//,4,,,,,15,0,0,0,0,ENTREGADO
E-COMMERCE,Onyx 250,Onyx,28,2357,0.02886406,68.03258845,2.429735302,8,23,0,31,296,42.28571429,1.386416862,22.3597973,15,0,1,28,40.03258845,28,27,0.035714286,0.035714286,-3,42.55574324,//,1,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Ovni 170,Ovni,0,0,0,0,0,13,0,0,13,297,42.42857143,1.391100703,9.345117845,0,0,0,0,0,0,0,0,0,-13,9.345117845,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Ovni 200,Ovni,40,2016,0.051065464,102.9479747,2.573699366,0,0,0,0,297,42.42857143,1.391100703,0,20,0,20,40,62.94797466,40,20,0.5,0.5,40,28.75420875,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Ovni Track 170,Ovni Track,0,0,0,0,0,1,0,0,1,207,29.57142857,0.969555035,1.031400966,0,0,0,0,0,0,0,0,0,-1,1.031400966,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Ovni Track 200,Ovni Track,40,4431,0.032598714,144.4449036,3.61112259,4,24,0,28,207,29.57142857,0.969555035,28.87922705,0,0,40,40,104.4449036,40,0,1,1,12,70.1352657,//,2,,,,,40,0,0,0,0,ENTREGADO
E-COMMERCE,Phantom 200 S,Phantom,30,1271,0.03631112,46.15143388,1.538381129,0,10,0,10,272,38.85714286,1.274004684,7.849264706,20,0,10,30,16.15143388,30,20,0.333333333,0.333333333,20,31.39705882,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Rambler 125 Gris,Rambler,0,0,0,0,0,0,1,0,1,107,15.28571429,0.50117096,1.995327103,0,0,0,0,0,0,0,0,0,-1,1.995327103,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rambler 125 Negro,Rambler,20,1966,0.051729234,101.6996748,5.084983742,4,10,0,14,107,15.28571429,0.50117096,27.93457944,0,0,8,10,91.69967484,8,0,1,0.4,6,43.89719626,//,1,,,,,8,0,0,0,0,ENTREGADO
E-COMMERCE,Rambler 125 Negro,Rambler,20,0,0.05,0,0,4,10,0,14,107,15.28571429,0.50117096,27.93457944,0,0,8,0,0,0,-8,0,0.4,6,27.93457944,,,,,,,8,0,0,0,0,ENTREGADO
E-COMMERCE,Rapid 125,Rapid,0,0,0,0,0,4,1,0,5,70,10,0.327868852,15.25,0,0,0,0,0,0,0,0,0,-5,15.25,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rapid 125 RT,Rapid,10,819,0.031266285,25.60708702,2.560708702,20,0,0,20,70,10,0.327868852,61,0,0,0,10,15.60708702,0,0,0,0,-10,61,Se cubre desabasto de septiembre,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Reptile Trek 200,Reptile Trek,50,5646,0.041841004,236.2343096,4.724686192,45,37,0,82,513,73.28571429,2.402810304,34.12670565,0,0,30,50,186.2343096,30,0,1,0.6,-32,46.61208577,//,0,,,,,0,30,0,0,0,ENTREGADO
E-COMMERCE,Rex 350,Rex 350,1,37,0.364485981,13.48598131,13.48598131,0,2,0,2,8,1.142857143,0.037470726,53.375,0,0,0,0,13.48598131,0,0,0,0,-1,53.375,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rex 550,Rex 550,2,63,0.076142132,4.796954315,2.398477157,1,2,0,3,7,1,0.032786885,91.5,0,0,0,0,4.796954315,0,0,0,0,-1,91.5,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rocketman 300 Carrera,Rocketman Carrera,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rocketman 300 Platinum,Rocketman Racing,35,1995,0.070577856,140.8028231,4.022937803,6,0,0,6,190,27.14285714,0.889929742,6.742105263,0,0,0,35,105.8028231,0,0,0,0,29,6.742105263,//,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rocketman Racing 300,Rocketman Racing,0,0,0,0,0,1,2,0,3,190,27.14285714,0.889929742,3.371052632,0,0,0,0,0,0,0,0,0,-3,3.371052632,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Ruda 170,Ruda,0,0,0,0,0,1,0,0,1,501,71.57142857,2.346604215,0.426147705,0,0,0,0,0,0,0,0,0,-1,0.426147705,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Ruda 170 F4,Ruda,0,2498,0.022706853,56.72171853,0,7,19,0,26,501,71.57142857,2.346604215,11.07984032,0,0,60,60,-3.278281467,60,0,1,0,-26,36.64870259,//,2,,,,,60,0,0,0,0,ENTREGADO
E-COMMERCE,Ryder 190,Ryder,25,4390,0.014065699,61.74841983,2.469936793,10,1,0,11,127,18.14285714,0.594847775,18.49212598,0,0,5,10,51.74841983,20,15,0.25,0.2,14,52.11417323,//,5,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Screamer 300 Gris,Screamer,18,346,0.057418699,19.86686992,1.103714995,5,18,0,23,123,17.57142857,0.576112412,39.92276423,0,0,9,18,1.866869919,18,9,0.5,0.5,-5,71.16666667,//,1,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Screamer Sportivo 300 Azul,Screamer Sportivo,30,1254,0.064875824,81.35428282,2.711809427,17,15,0,32,169,24.14285714,0.791569087,40.4260355,15,0,0,30,51.35428282,15,15,0,0,-2,59.37573964,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Spectra 7i 125,Spectra,30,1792,0.022610483,40.51798561,1.35059952,14,1,0,15,156,22.28571429,0.730679157,20.52884615,0,0,11,30,10.51798561,11,0,1,0.366666667,15,35.58333333,//,2,,,,,11,0,0,0,0,ENTREGADO
E-COMMERCE,Spirit 170,Spirit,30,4094,0.037469502,153.4001394,5.113337981,2,16,0,18,269,38.42857143,1.259953162,14.28624535,0,0,30,30,123.4001394,30,0,1,1,12,38.09665428,//,19,,,,,30,0,0,0,0,ENTREGADO
E-COMMERCE,Storm 300 2.0,Storm,25,1808,0.027027027,48.86486486,1.954594595,7,34,0,41,192,27.42857143,0.899297424,45.59114583,0,0,5,25,23.86486486,5,0,1,0.2,-16,51.15104167,//,2,,,,,5,0,0,0,0,ENTREGADO
E-COMMERCE,Streetrod Rojo 170,Streetrod,15,889,0.107400131,95.47871644,6.365247762,16,31,0,47,157,22.42857143,0.735362998,63.91401274,0,0,0,15,80.47871644,0,0,0,0,-32,63.91401274,Retirar 20 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Terra 170 DS,Terra,20,2824,0.018394845,51.94704159,2.59735208,0,12,0,12,191,27.28571429,0.894613583,13.41361257,0,0,20,20,31.94704159,20,0,1,1,8,35.76963351,//,1,,,,,0,20,0,0,0,ENTREGADO
E-COMMERCE,Terra 170 S,Terra,0,0,0,0,0,1,1,0,2,191,27.28571429,0.894613583,2.235602094,0,0,0,0,0,0,0,0,0,-2,2.235602094,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Thriller 210,Thriller,0,0,0,0,0,1,2,0,3,198,28.28571429,0.927400468,3.234848485,0,0,0,0,0,0,0,0,0,-3,3.234848485,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Thriller 250,Thriller,25,1017,0.082891566,84.30072289,3.372028916,2,10,0,12,198,28.28571429,0.927400468,12.93939394,0,0,2,25,59.30072289,30,28,0.066666667,0.08,13,45.28787879,//,3,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Thunderstar 300 S,Thunderstar,25,947,0.069045772,65.386346,2.61545384,0,2,0,2,305,43.57142857,1.428571429,1.4,0,0,45,25,40.386346,45,0,1,1.8,23,32.9,//,6,,,,,45,0,0,0,0,ENTREGADO
E-COMMERCE,Tornado 300 Negro,Tornado,35,2925,0.039226915,114.7387258,3.27824931,10,20,0,30,342,48.85714286,1.601873536,18.72807018,0,0,40,35,79.73872584,40,0,1,1.142857143,5,43.69883041,//,18,,,,,40,0,0,0,0,ENTREGADO
E-COMMERCE,Volt Air Sway Min,Volt Air Min,0,0,0,0,0,4,0,0,4,7,1,0.032786885,122,0,0,0,0,0,0,0,0,0,-4,122,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Volt Air Sway Power Negro,Volt Air Power,0,0,0,0,0,0,8,0,8,6,0.857142857,0.028103044,284.6666667,0,0,0,0,0,0,0,0,0,-8,284.6666667,,,,,,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Workman 190,Workman 190,15,16,0.06432247,1.02915952,0.068610635,6,0,0,6,127,18.14285714,0.594847775,10.08661417,0,0,0,15,-13.97084048,0,0,0,0,9,10.08661417,Sin inventario disponible. Modelo descontinuado.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Workman 250,Workman 250,30,26,0.085345121,2.218973138,0.073965771,0,11,0,11,326,46.57142857,1.526932084,7.20398773,0,0,0,30,-27.78102686,0,0,0,0,19,7.20398773,Sin arribos programados hasta octubre.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Xplor 190 Gris,Xplor,13,2255,0.014561822,32.8369076,2.525915969,19,0,0,19,139,19.85714286,0.651053864,29.18345324,0,0,13,13,19.8369076,13,0,1,1,-6,49.15107914,//,4,,,,,13,0,0,0,0,ENTREGADO
E-COMMERCE,Xpress Sport 170,Xpress,50,2661,0.011451792,30.47321758,0.609464352,19,21,0,40,378,54,1.770491803,22.59259259,7,0,33,20,10.47321758,40,7,0.825,0.66,10,45.18518519,Sin arribos programados hasta la última semana de septiembre.,16,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Yuma 250,Yuma 250,40,4687,0.059807871,280.3194918,7.007987295,6,2,0,8,249,35.57142857,1.166276347,6.859437751,0,0,24,40,240.3194918,40,16,0.6,0.6,32,41.15662651,//,0,,,,,0,0,0,0,0,PENDIENTE

`;

/* ----------------------------------------------------------------------
   2) COLUMNAS QUE EL DASHBOARD RECONOCE
   Estas listas se usan sólo para VALIDAR y para saber qué mostrar; si
   faltan, el dashboard sigue funcionando con lo que sí exista
   (ver normalizeData() y validateColumns()).
   ---------------------------------------------------------------------- */
const EXPECTED_COLUMNS = [
  "Unidad de Negocio", "Modelo Planeación", "Modelo Agrupado", "FC Septiembre",
  "Inventario Total Proyectado", "% Asignacion", "Inv Asignado", "Cumplimiento de Inv",
  "Inventario Gnrl.", "Ventas", "Pro Venta Mensual", "PVD", "DOH",
  "Programado (Logística)", "Motos en Recepción Pendiente", "Traslado Completado",
  "Requerimiento", "Diferencia", "Pedido Revisado", "Pendiente por entregar",
  "% Cumplimiento de Entrega", "% Cumplimiento FC", "Desviacion FC", "DOH Proyectado",
  "Comentarios", "Inventario Cumplido", "ESTATUS"
];

// Columnas de almacén conocidas para E-COMMERCE y DISTRIBUIDORES (ver sección 48:
// "NO DUPLICAR INVENTARIO" — estas se muestran informativamente pero el cálculo
// de capacidad/utilización usa exclusivamente "Inventario Gnrl.").
const WAREHOUSE_COLUMNS = ["60.3", "17.7", "17.4"];

/* ----------------------------------------------------------------------
   3) PARSER CSV genérico (sin dependencias externas)
   Soporta comillas, comas dentro de comillas y saltos de línea \r\n.
   ---------------------------------------------------------------------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  // normaliza saltos de línea
  const clean = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\n") { pushField(); pushRow(); }
      else field += c;
    }
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map(h => String(h).trim());
  const records = rows.slice(1)
    .filter(r => r.some(v => String(v).trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ""; });
      return obj;
    });
  return { headers, records };
}

/* ----------------------------------------------------------------------
   4) UTILIDADES DE CONVERSIÓN ROBUSTA
   ---------------------------------------------------------------------- */
function toNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v).trim();
  if (s === "" || s.toUpperCase() === "N/A" || s === "-") return 0;
  s = s.replace(/%/g, "").replace(/,/g, "").replace(/\s/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
function toText(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/* ----------------------------------------------------------------------
   5) DETECCIÓN DINÁMICA DE COLUMNAS DE SEMANA
   Cualquier encabezado puramente numérico (37, 38, 39, 40, 41, 42...) se
   interpreta como "Inventario Cumplido de esa semana". Esto permite
   agregar semanas futuras sin tocar el código (sección 47).

   Para "Inventario Proyectado Por Semana" se buscan, en este orden:
     a) una columna exacta llamada "Inventario Proyectado Por Semana" +
        un sufijo de semana (ej. "Inventario Proyectado Por Semana 37"),
     b) una columna "Proyectado 37", "Proy 37", etc.
   Si NINGUNA base trae esa columna todavía (como ocurre con la base
   actual), el dashboard lo indica de forma explícita como
   "SIN PROYECCIÓN" en vez de inventar un valor (ver sección 8 del
   prompt, que ya contempla este caso).
   ---------------------------------------------------------------------- */
function detectWeekColumns(headers) {
  const cumplidoCols = []; // { header, week }
  const proyectadoCols = []; // { header, week }

  headers.forEach(h => {
    const trimmed = h.trim();
    // columna puramente numérica -> cumplido real de esa semana
    if (/^\d+$/.test(trimmed)) {
      cumplidoCols.push({ header: h, week: parseInt(trimmed, 10) });
      return;
    }
    // "Inventario Proyectado Por Semana 37" / "Proyectado 37" / "Proy37"
    const m = trimmed.match(/(?:inventario\s+proyectado\s+por\s+semana|proyectado|proy)\s*\.?\s*(\d{1,3})$/i);
    if (m) {
      proyectadoCols.push({ header: h, week: parseInt(m[1], 10) });
    }
  });

  cumplidoCols.sort((a, b) => a.week - b.week);
  proyectadoCols.sort((a, b) => a.week - b.week);
  return { cumplidoCols, proyectadoCols };
}

/* ----------------------------------------------------------------------
   6) VALIDACIÓN DE COLUMNAS (sección 31)
   ---------------------------------------------------------------------- */
function validateColumns(headers) {
  // "Inventario Cumplido" es opcional: si no está, se deriva de las columnas
  // de semana (ver normalizeData). No se reporta como columna faltante.
  // "FC Septiembre" es el nombre del mes actual del Forecast; si la base trae
  // otro mes (ej. "FC Octubre"), no se debe reportar como columna faltante.
  const required = EXPECTED_COLUMNS.filter(c => c !== "Inventario Cumplido" && c !== "FC Septiembre");
  const tieneColumnaForecast = headers.includes("Forecast") || headers.some(h => /^FC\s+\S+/i.test(h.trim()));
  const missing = required.filter(c => !headers.includes(c));
  if (!tieneColumnaForecast) missing.push("FC <mes> (Forecast)");
  const extra = headers.filter(h => !EXPECTED_COLUMNS.includes(h) && !WAREHOUSE_COLUMNS.includes(h) && !/^\d+$/.test(h));
  return { missing, extra, ok: missing.length === 0 };
}

/* ----------------------------------------------------------------------
   7) NORMALIZACIÓN PRINCIPAL
   Convierte los registros crudos del CSV en la estructura interna que
   usa el resto del dashboard. No asume que ambos canales tienen las
   mismas columnas: cada campo se busca por nombre y, si no existe, se
   crea con 0 o vacío (nunca se pierde información del otro canal).
   ---------------------------------------------------------------------- */
function normalizeData(parsed) {
  const { headers, records } = parsed;
  const { cumplidoCols, proyectadoCols } = detectWeekColumns(headers);

  // Mes del Forecast: se lee del propio encabezado (ej. "FC Septiembre" -> "SEPTIEMBRE"),
  // nunca se escribe a mano. Si la base ya trae una columna "Forecast" literal (formato con
  // Forecast_Periodo por filas), se usa esa directamente en vez de buscar "FC <mes>".
  // La búsqueda ignora mayúsculas/minúsculas y espacios sobrantes en el encabezado real.
  const findHeader = (name) => headers.find(h => h.trim().toLowerCase() === name.toLowerCase());
  const forecastLiteral = findHeader("Forecast");
  const forecastHeader = forecastLiteral
    ? forecastLiteral
    : (headers.find(h => /^FC\s+\S+/i.test(h.trim())) || "FC Septiembre");
  const forecastMonthMatch = forecastHeader.trim().match(/^FC\s+(.+)$/i);
  const forecastMonthLabel = forecastMonthMatch ? forecastMonthMatch[1].trim().toUpperCase() : null;

  // Forecast_Periodo (o equivalente ya existente: Periodo/Temporada/Mes/Version/Ciclo).
  // Si no existe ninguna, forecastPeriodoHeader queda null y todas las filas obtienen
  // forecastPeriodo = null -> el filtro de Forecast no aparece y nada cambia (sección 13/16).
  const FORECAST_PERIOD_ALIASES = ["Forecast_Periodo", "Periodo", "Temporada", "Mes", "Version", "Ciclo"];
  let forecastPeriodoHeader = null;
  for (const alias of FORECAST_PERIOD_ALIASES) {
    const found = findHeader(alias);
    if (found) { forecastPeriodoHeader = found; break; }
  }

  const data = records.map(r => {
    const canal = toText(r["Unidad de Negocio"]).toUpperCase();

    // Almacenes: se conservan de forma informativa (ver sección 48 —
    // NUNCA se suman a "Inventario Gnrl." para evitar doble conteo).
    const almacenes = {};
    WAREHOUSE_COLUMNS.forEach(w => { if (w in r) almacenes[w] = toNumber(r[w]); });

    const semanas = {};
    cumplidoCols.forEach(({ header, week }) => { semanas[week] = toNumber(r[header]); });

    const proyectadoSemanal = {};
    proyectadoCols.forEach(({ header, week }) => { proyectadoSemanal[week] = toNumber(r[header]); });

    const rec = {
      canal,
      modelo: toText(r["Modelo Planeación"]),
      modeloAgrupado: toText(r["Modelo Agrupado"]),
      forecast: toNumber(r[forecastHeader]),
      inventarioTotalProyectado: toNumber(r["Inventario Total Proyectado"]),
      pctAsignacion: toNumber(r["% Asignacion"]),
      invAsignado: toNumber(r["Inv Asignado"]),
      cumplimientoInv: toNumber(r["Cumplimiento de Inv"]),
      almacenes,                      // { "60.3": x, "17.7": y, "17.4": z } — sólo informativo
      inventarioGnrl: toNumber(r["Inventario Gnrl."]),
      ventas: toNumber(r["Ventas"]),
      proVentaMensual: toNumber(r["Pro Venta Mensual"]),
      pvd: toNumber(r["PVD"]),
      doh: toNumber(r["DOH"]),
      programado: toNumber(r["Programado (Logística)"]),
      recepcionPendiente: toNumber(r["Motos en Recepción Pendiente"]),
      trasladoCompletado: toNumber(r["Traslado Completado"]),
      requerimiento: toNumber(r["Requerimiento"]),
      diferencia: toNumber(r["Diferencia"]),
      pedidoRevisado: toNumber(r["Pedido Revisado"]),
      pendienteColOrigen: toNumber(r["Pendiente por entregar"]),
      pctCumplimientoEntregaOrigen: toNumber(r["% Cumplimiento de Entrega"]),
      pctCumplimientoFCOrigen: toNumber(r["% Cumplimiento FC"]),
      desviacionFC: toNumber(r["Desviacion FC"]),
      dohProyectado: toNumber(r["DOH Proyectado"]),
      comentarios: toText(r["Comentarios"]),
      semanas,             // cumplido REAL por semana -> { 37: x, 38: y, ... }
      proyectadoSemanal,   // proyectado por semana (si la base lo trae) -> { 37: x, ... }
      // "Inventario Cumplido": se resuelve en este orden de prioridad, SIEMPRE
      // reutilizando una columna real de la base (nunca se inventa un número):
      //
      //   1) columna explícita "Inventario Cumplido" (algunas bases la traen ya
      //      calculada) -> se usa tal cual, y Pendiente = Pedido - esta columna.
      //
      //   2) columna "Pendiente por entregar" (la calcula el sistema de origen,
      //      y es la fuente AUTORIZADA) -> Inventario Cumplido se DERIVA de
      //      ella para que ambos valores sean siempre consistentes:
      //      Cumplido = Pedido Revisado - Pendiente.
      //
      //   3) si no existe ninguna de las dos anteriores, se usa la suma de las
      //      columnas de semana (36,37,38...) si aportan algo, y si no,
      //      "Traslado Completado".
      inventarioCumplido: (() => {
        if (headers.includes("Inventario Cumplido")) return toNumber(r["Inventario Cumplido"]);
        if (headers.includes("Pendiente por entregar")) {
          return toNumber(r["Pedido Revisado"]) - toNumber(r["Pendiente por entregar"]);
        }
        const sumaSemanas = Object.values(semanas).reduce((a, v) => a + v, 0);
        if (sumaSemanas > 0) return sumaSemanas;
        return toNumber(r["Traslado Completado"]);
      })(),
      estatus: toText(r["ESTATUS"]),
      forecastPeriodo: forecastPeriodoHeader ? toText(r[forecastPeriodoHeader]).toUpperCase() : null,
    };
    return rec;
  }).filter(r => r.modelo !== "");

  const weeksAvailable = Array.from(new Set([
    ...cumplidoCols.map(c => c.week),
    ...proyectadoCols.map(c => c.week)
  ])).sort((a, b) => a - b);

  const forecastPeriodsAvailable = forecastPeriodoHeader
    ? Array.from(new Set(data.map(d => d.forecastPeriodo).filter(Boolean)))
    : [];

  return { data, weeksAvailable, tieneProyeccionSemanal: proyectadoCols.length > 0, forecastMonthLabel, forecastPeriodsAvailable };
}

/* ----------------------------------------------------------------------
   8) CARGA INICIAL
   ---------------------------------------------------------------------- */
function loadDefaultData() {
  const parsed = parseCSV(DEFAULT_CSV_TEXT);
  const validation = validateColumns(parsed.headers);
  const normalized = normalizeData(parsed);
  return { ...normalized, validation, sourceName: "base.csv (incluida por defecto)" };
}
