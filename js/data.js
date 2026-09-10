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
E-COMMERCE,Alpina 300,Alpina,25,407,0.05,20.35,0.814,4,9,0,13,156,26,0.852459016,15.25,0,0,5,25,-4.65,5,0,1,0.2,12,21.11538462,Sin arribos programados hasta octubre.,5,,,,,5,0,0,0,0,ENTREGADO
E-COMMERCE,Atom 170 2.0,Atom,40,4514,0.04,180.56,4.514,10,22,0,32,359,59.83333333,1.961748634,16.31197772,20,0,10,40,140.56,30,20,0.333333333,0.25,8,31.60445682,//,12,,,,,10,0,0,0,0,PENDIENTE
E-COMMERCE,Axus 170,Axus,27,6591,0.03,197.73,7.323333333,14,17,0,31,321,53.5,1.754098361,17.6728972,21,0,0,27,170.73,27,27,0,0,-4,33.06542056,//,6,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Blast 125,Blast,15,1126,0.04,45.04,3.002666667,6,5,0,11,141,23.5,0.770491803,14.27659574,10,0,5,15,30.04,15,10,0.333333333,0.333333333,4,33.74468085,//,8,,,,,5,0,0,0,0,PENDIENTE
E-COMMERCE,Bristol N400,Bristol,10,771,0.06,46.26,4.626,7,20,0,27,9,1.5,0.049180328,549,0,0,0,0,46.26,0,0,0,0,-17,549,Retirar 17 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,California R300,California,10,1187,0.02,23.74,2.374,1,1,0,2,5,0.833333333,0.027322404,73.2,0,0,0,0,23.74,0,0,0,0,8,73.2,//,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Colt 300,Colt 300,5,1467,0.03,44.01,8.802,0,17,0,17,68,11.33333333,0.371584699,45.75,0,0,0,15,29.01,15,15,0,0,-12,86.11764706,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Cougar 250,Cougar 250,30,957,0.07,66.99,2.233,7,28,0,35,143,23.83333333,0.781420765,44.79020979,0,0,0,30,36.99,0,0,0,0,-5,44.79020979,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 170 Rojo,Crossmax 170,15,1094,0.03,32.82,2.188,7,9,0,16,59,9.833333333,0.322404372,49.62711864,0,0,0,10,22.82,0,0,0,0,-1,49.62711864,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Crossmax 220 Led,Crossmax 220,85,5284,0.031,163.804,1.927105882,21,18,0,39,225,37.5,1.229508197,31.72,0,0,2,85,78.804,47,45,0.042553191,0.023529412,46,69.94666667,//,3,,,,,2,0,0,0,0,PENDIENTE
E-COMMERCE,Crossmax 250 Led,Crossmax 250,20,2964,0.035,103.74,5.187,4,16,0,20,0,0,0,0,20,0,0,20,83.74,20,20,0,0,0,0,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Crossmax 330 Rally TRX Negro,Crossmax RALLY,25,5831,0.016,93.296,3.73184,4,25,0,29,57,9.5,0.31147541,93.10526316,0,0,0,0,93.296,0,0,0,0,-4,93.10526316,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Cyclone 210 Gris,Cyclone,40,3957,0.04,158.28,3.957,14,16,0,30,277,46.16666667,1.513661202,19.81949458,30,0,0,40,118.28,30,30,0,0,10,39.63898917,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Dakar 330,Dakar,20,2283,0.02,45.66,2.283,5,21,0,26,88,14.66666667,0.480874317,54.06818182,10,0,0,20,25.66,20,20,0,0,-6,95.65909091,,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Falkon 250 Z3,Falkon,25,3299,0.02,65.98,2.6392,10,12,0,22,139,23.16666667,0.759562842,28.96402878,5,0,1,25,40.98,6,5,0.166666667,0.04,3,36.86330935,//,1,,,,,1,0,0,0,0,PENDIENTE
E-COMMERCE,Gladiator 200 2.0,Gladiator,68,4056,0.04,162.24,2.385882353,34,13,0,47,443,73.83333333,2.420765027,19.41534989,61,0,0,68,94.24,61,61,0,0,21,44.61399549,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,GTS Pro 300,GTS PRO,20,38,0.08,3.04,0.152,0,4,0,4,170,28.33333333,0.928961749,4.305882353,0,0,0,0,3.04,0,0,0,0,16,4.305882353,Modelo descontinuado.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,HIPSTER 170,Hipster,8,178,0.08,14.24,1.78,3,3,0,6,47,7.833333333,0.256830601,23.36170213,2,0,1,8,6.24,3,2,0.333333333,0.125,2,35.04255319,//,2,,,,,1,0,0,0,0,PENDIENTE
E-COMMERCE,Hyper 310,Hyper,5,546,0.07,38.22,7.644,3,8,0,11,24,4,0.131147541,83.875,0,0,0,5,33.22,0,0,0,0,-6,83.875,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Intrepid 125 SX,Intrepid,16,3526,0.03,105.78,6.61125,6,30,0,36,79,13.16666667,0.431693989,83.39240506,0,0,0,0,105.78,0,0,0,0,-20,83.39240506,Retirar 20 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Lithium 190,Lithium,80,5398,0.03,161.94,2.02425,60,3,0,63,488,81.33333333,2.666666667,23.625,0,0,0,20,141.94,40,40,0,0,17,38.625,//,1,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,M1 - 200,M1,15,3487,0.01,34.87,2.324666667,0,11,0,11,76,12.66666667,0.415300546,26.48684211,11,0,4,15,19.87,15,11,0.266666667,0.266666667,4,62.60526316,,4,,,,,4,0,0,0,0,PENDIENTE
E-COMMERCE,Nitrox 250 T3,Nitrox 250,25,1014,0.029306488,29.71677852,1.188671141,24,42,0,66,142,23.66666667,0.775956284,85.05633803,0,0,0,0,29.71677852,0,0,0,0,-41,85.05633803,Retirar 40 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Nitrox 330,Nitrox 330,20,1184,0.02,23.68,1.184,3,9,0,12,0,0,0,0,12,0,3,20,3.68,15,12,0.2,0.15,8,0,//,4,,,,,3,0,0,0,0,PENDIENTE
E-COMMERCE,Onyx 250,Onyx,28,2357,0.03,70.71,2.525357143,8,23,0,31,293,48.83333333,1.601092896,19.36177474,0,0,1,28,42.71,28,27,0.035714286,0.035714286,-3,36.84982935,//,1,,,,,1,0,0,0,0,PENDIENTE
E-COMMERCE,Ovni 200,Ovni,40,2016,0.06,120.96,3.024,0,0,0,0,0,0,0,0,20,0,0,40,80.96,40,40,0,0,40,0,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Ovni Track 200,Ovni Track,40,4431,0.027197477,120.5120221,3.012800552,4,24,0,28,0,0,0,0,38,0,2,40,80.51202207,40,38,0.05,0.05,12,0,//,2,,,,,2,0,0,0,0,PENDIENTE
E-COMMERCE,Phantom 200 S,Phantom,30,1271,0.04,50.84,1.694666667,0,10,0,10,0,0,0,0,10,0,0,30,20.84,30,30,0,0,20,0,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Rambler 125 Negro,Rambler,20,1966,0.06,117.96,5.898,4,10,0,14,108,18,0.590163934,23.72222222,7,0,1,10,107.96,8,7,0.125,0.05,6,37.27777778,//,1,,,,,1,0,0,0,0,PENDIENTE
E-COMMERCE,Rapid 125 RT,Rapid,10,819,0.03,24.57,2.457,20,0,0,20,65,10.83333333,0.355191257,56.30769231,0,0,0,10,14.57,0,0,0,0,-10,56.30769231,Se cubre desabasto de septiembre,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Reptile Trek 200,Reptile Trek,50,5646,0.032,180.672,3.61344,45,37,0,82,501,83.5,2.737704918,29.95209581,30,0,0,50,130.672,30,30,0,0,-32,40.91017964,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Rex 350,Rex 350,1,37,0.01,0.37,0.37,0,2,0,2,8,1.333333333,0.043715847,45.75,0,0,0,0,0.37,0,0,0,0,-1,45.75,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rex 550,Rex 550,2,63,0.06,3.78,1.89,1,2,0,3,6,1,0.032786885,91.5,0,0,0,0,3.78,0,0,0,0,-1,91.5,,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Rocketman 300 Platinum,Rocketman Racing,35,1995,0.11,219.45,6.27,6,0,0,6,64,10.66666667,0.349726776,17.15625,0,0,0,35,184.45,0,0,0,0,29,17.15625,//,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Ruda 200 F4,Ruda,60,2498,0.02,49.96,0.832666667,0,0,0,0,0,0,0,0,60,0,2,60,-10.04,60,58,0.033333333,0.033333333,60,0,//,2,,,,,2,0,0,0,0,PENDIENTE
E-COMMERCE,Ryder 190,Ryder,25,4390,0.01,43.9,1.756,10,1,0,11,127,21.16666667,0.693989071,15.8503937,0,0,5,10,33.9,20,15,0.25,0.2,14,44.66929134,//,5,,,,,5,0,0,0,0,PENDIENTE
E-COMMERCE,Screamer 300 Gris,Screamer,18,346,0.07,24.22,1.345555556,5,18,0,23,123,20.5,0.672131148,34.2195122,9,0,0,18,6.22,18,18,0,0,-5,61,//,1,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Screamer Sportivo 300 Azul,Screamer Sportivo,30,1254,0.1,125.4,4.18,17,15,0,32,169,28.16666667,0.923497268,34.65088757,0,0,0,30,95.4,15,15,0,0,-2,50.89349112,//,0,,,,,0,0,0,0,0,PENDIENTE
E-COMMERCE,Spectra 7i 125,Spectra,30,1792,0.05,89.6,2.986666667,14,1,0,15,153,25.5,0.836065574,17.94117647,9,0,2,30,59.6,11,9,0.181818182,0.066666667,15,31.09803922,//,2,,,,,2,0,0,0,0,PENDIENTE
E-COMMERCE,Spirit 170,Spirit,30,4094,0.04,163.76,5.458666667,2,16,0,18,262,43.66666667,1.431693989,12.57251908,15,0,15,30,133.76,30,15,0.5,0.5,12,33.52671756,//,19,,,,,15,0,0,0,0,PENDIENTE
E-COMMERCE,Storm 300 2.0,Storm,25,1808,0.024,43.392,1.73568,7,34,0,41,190,31.66666667,1.038251366,39.48947368,3,0,2,25,18.392,5,3,0.4,0.08,-16,44.30526316,//,2,,,,,2,0,0,0,0,PENDIENTE
E-COMMERCE,Streetrod Rojo 170,Streetrod,15,889,0.09,80.01,5.334,16,31,0,47,154,25.66666667,0.841530055,55.85064935,0,0,0,15,65.01,0,0,0,0,-32,55.85064935,Retirar 20 unidades.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Terra 170 DS,Terra,20,2824,0.02,56.48,2.824,0,12,0,12,186,31,1.016393443,11.80645161,20,0,1,20,36.48,20,19,0.05,0.05,8,31.48387097,//,1,,,,,1,0,0,0,0,PENDIENTE
E-COMMERCE,Thriller 250,Thriller,25,1017,0.05,50.85,2.034,2,10,0,12,198,33,1.081967213,11.09090909,0,0,2,25,25.85,30,28,0.066666667,0.08,13,38.81818182,//,3,,,,,2,0,0,0,0,PENDIENTE
E-COMMERCE,Thunderstar 300 S,Thunderstar,25,947,0.06,56.82,2.2728,0,2,0,2,305,50.83333333,1.666666667,1.2,39,0,6,25,31.82,45,39,0.133333333,0.24,23,28.2,//,6,,,,,6,0,0,0,0,PENDIENTE
E-COMMERCE,Tornado 300 Negro,Tornado,35,2925,0.04,117,3.342857143,10,20,0,30,333,55.5,1.819672131,16.48648649,22,0,18,35,82,40,22,0.45,0.514285714,5,38.46846847,//,18,,,,,18,0,0,0,0,PENDIENTE
E-COMMERCE,Workman 190,Workman 190,15,16,0.06,0.96,0.064,6,0,0,6,126,21,0.68852459,8.714285714,0,0,0,15,-14.04,0,0,0,0,9,8.714285714,Sin inventario disponible. Modelo descontinuado.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Workman 250,Workman 250,30,26,0.06,1.56,0.052,0,11,0,11,324,54,1.770491803,6.212962963,0,0,0,30,-28.44,0,0,0,0,19,6.212962963,Sin arribos programados hasta octubre.,0,0,0,0,,0,0,0,0,0,ENTREGADO
E-COMMERCE,Xplor 190 Gris,Xplor,13,2255,0.02,45.1,3.469230769,19,0,0,19,139,23.16666667,0.759562842,25.01438849,9,0,4,13,32.1,13,9,0.307692308,0.307692308,-6,42.1294964,//,4,,,,,4,0,0,0,0,PENDIENTE
E-COMMERCE,Xpress Sport 170,Xpress,50,2661,0.01,26.61,0.5322,19,21,0,40,373,62.16666667,2.038251366,19.62466488,27,0,13,20,6.61,40,27,0.325,0.26,10,39.24932976,Sin arribos programados hasta la última semana de septiembre.,16,,,,,13,0,0,0,0,PENDIENTE
E-COMMERCE,Yuma 250,Yuma 250,40,4687,0.02,93.74,2.3435,6,2,0,8,245,40.83333333,1.338797814,5.975510204,24,0,0,40,53.74,40,40,0,0,32,35.85306122,//,0,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Alpina 300,Alpina,41,407,0.05,20.35,0.496341463,0,0,33,33,234,39,1.278688525,25.80769231,0,0,8,8,12.35,8,0,1,0.195121951,8,32.06410256,Sin arribos en septiembre ,8,0,0,0,,8,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Atom 170 2.0,Atom,48,4514,0.04,180.56,3.761666667,0,0,22,22,381,63.5,2.081967213,10.56692913,0,0,28,48,132.56,48,20,0.583333333,0.583333333,26,33.62204724,0,32,16,0,0,,28,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Axus 170,Axus,60,6591,0.03,197.73,3.2955,0,0,63,63,399,66.5,2.180327869,28.89473684,0,0,0,0,197.73,0,0,0,0,-3,28.89473684,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Blast 125,Blast,0,1126,0.04,45.04,0,0,0,0,0,105,17.5,0.573770492,0,0,0,0,0,45.04,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Bristol N400,Bristol,0,771,0.12,92.52,0,0,0,1,1,25,4.166666667,0.136612022,7.32,0,0,0,0,92.52,0,0,0,0,-1,7.32,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Bristol N400 ABS,Bristol ABS,15,313,0.04,12.52,0.834666667,0,0,11,11,2,0.333333333,0.010928962,1006.5,0,0,18,15,-2.48,15,-3,1.2,1.2,4,2379,Sin arribos en septiembre Para cubrir hasta Octubre,15,0,0,0,,18,0,0,0,0,ENTREGADO
DISTRIBUIDORES,California R300,California ABS,0,1185,0.11,130.35,0,0,0,0,0,55,9.166666667,0.300546448,0,0,0,0,0,130.35,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,California R300 ABS,California ABS,30,1185,0.04,47.4,1.58,0,0,29,29,14,2.333333333,0.076502732,379.0714286,0,0,1,20,27.4,1,0,1,0.033333333,1,392.1428571,0,1,0,0,0,,1,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Colt 300,Colt 300,39,1467,0.08,117.36,3.009230769,0,0,14,14,157,26.16666667,0.857923497,16.31847134,0,0,0,25,92.36,20,20,0,0,25,39.63057325,0,0,20,0,0,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Corsel 300,Corsel 300,0,327,0.04,13.08,0,0,0,3,3,41,6.833333333,0.224043716,13.3902439,0,0,4,0,13.08,0,-4,0,0,-3,13.3902439,0,0,0,0,0,,4,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Cougar 250,Cougar 250,45,957,0.08,76.56,1.701333333,0,0,66,66,248,41.33333333,1.355191257,48.7016129,0,0,0,0,76.56,0,0,0,0,-21,48.7016129,No se retiran del Inventario para cubrir desavasto y pueda aguantar a asignación de Octubre,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 170 Rojo,Crossmax 170,70,1094,0.1,109.4,1.562857143,0,0,94,94,401,66.83333333,2.191256831,42.89775561,0,0,0,0,109.4,0,0,0,0,-24,42.89775561,No se retiran del Inventario para cubrir desavasto y pueda aguantar a asignación de Octubre,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 220 Led,Crossmax 220,204,5284,0.05,264.2,1.295098039,0,0,1,1,591,98.5,3.229508197,0.30964467,0,0,103,204,60.2,204,101,0.504901961,0.504901961,203,63.47715736,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,103,0,21,80,,103,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Crossmax 250 Led,Crossmax 250,92,2964,0.08,237.12,2.577391304,0,0,116,116,108,18,0.590163934,196.5555556,0,0,35,92,145.12,35,0,1,0.380434783,-24,255.8611111,DOH altos comparación a su venta. Se da seguimiento ya que su FC se cumple con su inventario,35,0,0,0,,35,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Crossmax 330 Rally TRX Negro,Crossmax RALLY,199,5831,0.09,524.79,2.637135678,0,0,0,0,849,141.5,4.639344262,0,0,0,9,199,325.79,199,190,0.045226131,0.045226131,199,42.89399293,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,0,199,0,0,,9,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Cyclone 210 Gris,Cyclone,56,3957,0.03,118.71,2.119821429,0,0,55,55,309,51.5,1.68852459,32.57281553,0,0,15,0,118.71,15,0,1,0.267857143,1,41.45631068,0,15,0,0,0,,15,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Dakar 330,Dakar,154,2283,0.12,273.96,1.778961039,0,0,13,13,260,43.33333333,1.420765027,9.15,0,0,66,154,119.96,154,88,0.428571429,0.428571429,141,117.5423077,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,66,0,88,0,,66,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Falkon 250 Z3,Falkon,89,3299,0.04,131.96,1.482696629,0,0,0,0,427,71.16666667,2.333333333,0,0,0,89,89,42.96,89,0,1,1,89,38.14285714,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,89,0,0,0,,89,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Gladiator 200 2.0,Gladiator,214,4056,0.07,283.92,1.326728972,0,0,96,96,1125,187.5,6.147540984,15.616,0,0,150,100,183.92,150,0,1,0.700934579,118,40.016,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,150,0,0,0,,150,0,0,0,0,ENTREGADO
DISTRIBUIDORES,GTS Pro 300,GTS PRO,23,38,0.09,3.42,0.148695652,0,0,0,0,161,26.83333333,0.879781421,0,0,0,0,0,3.42,0,0,0,0,23,0,Descontinuado,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,HIPSTER 170,Hipster,12,178,0.06,10.68,0.89,0,0,15,15,52,8.666666667,0.284153005,52.78846154,0,0,0,0,10.68,0,0,0,0,-3,52.78846154,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Hyper 310,Hyper,18,546,0.11,60.06,3.336666667,0,0,25,25,31,5.166666667,0.169398907,147.5806452,0,0,0,0,60.06,0,0,0,0,-7,147.5806452,Considerar Retirar 15 motos,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Intrepid 125 SX,Intrepid,69,3526,0.07,246.82,3.577101449,0,0,8,8,174,29,0.950819672,8.413793103,0,0,60,70,176.82,60,0,1,0.869565217,61,71.51724138,Se contempla desabasto mes de septiembre para llenado de Octubre,60,0,0,0,,60,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Lithium 190,Lithium,118,5398,0.03,161.94,1.372372881,0,0,38,38,791,131.8333333,4.322404372,8.791403287,0,0,0,72,89.94,118,118,0,0,80,36.09102402,Habra cambio de cilindraje a 200 Favor de considerar,0,0,95,23,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,M1 - 200,M1,100,3487,0.17,592.79,5.9279,0,0,99,99,222,37,1.213114754,81.60810811,0,0,50,100,492.79,50,0,1,0.5,1,122.8243243,0,50,0,0,0,,50,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Nitrox 250 T3,Nitrox 250,46,1014,0.055480984,56.25771812,1.222993872,0,0,90,90,204,34,1.114754098,80.73529412,0,0,0,0,56.25771812,0,0,0,0,-44,80.73529412,Considerar Retirar 15 motos,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Nitrox 330,Nitrox 330,46,1184,0.03,35.52,0.772173913,0,0,0,0,124,20.66666667,0.677595628,0,0,0,0,52,-16.48,36,36,0,0,46,53.12903226,No hay arribos se asigna conforme a participacion de canal,36,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Onyx 250,Onyx,66,2357,0.05,117.85,1.785606061,0,0,49,49,524,87.33333333,2.863387978,17.11259542,0,0,1,66,51.85,66,65,0.015151515,0.015151515,17,40.16221374,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,5,,,,,1,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Ovni 170,Ovni,0,2016,0.04,80.64,0,0,0,0,0,269,44.83333333,1.469945355,0,0,0,0,0,80.64,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ovni 250,Ovni,0,2016,0.04,80.64,0,0,0,0,0,0,0,0,0,0,0,0,0,80.64,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ovni Track 170,Ovni Track,0,4431,0.063329392,280.6125345,0,0,0,29,29,431,71.83333333,2.355191257,12.31322506,0,0,0,0,280.6125345,0,0,0,0,-29,12.31322506,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ovni Track 200,Ovni Track,92,4431,0.04,177.24,1.926521739,0,0,34,34,0,0,0,0,0,0,92,26,151.24,92,0,1,1,58,0,0,92,0,0,0,,92,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Phantom 170 S,Phantom,32,1271,0.03,38.13,1.1915625,0,0,39,39,184,30.66666667,1.005464481,38.78804348,0,0,5,0,38.13,5,0,1,0.15625,-7,43.76086957,Habra cambio de cilindraje a 200 Favor de considerar,5,0,0,0,,5,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rambler 125,Rambler,0,1966,0.04,78.64,0,0,0,0,0,0,0,0,0,0,0,0,0,78.64,0,0,0,0,0,0,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rapid 125 RT,Rapid,0,819,0.04,32.76,0,0,0,5,5,101,16.83333333,0.551912568,9.059405941,0,0,0,0,32.76,0,0,0,0,-5,9.059405941,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Reptile Trek 200,Reptile Trek,40,5646,0.01,56.46,1.4115,0,0,3,3,299,49.83333333,1.633879781,1.836120401,0,0,54,40,16.46,56,2,0.964285714,1.35,37,36.11036789,No se puede entregar todo para 1ro  se prorratea con llegadas. Se monitorea DOH,54,,,,,54,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Rex 350,Rex 350,0,37,0.01,0.37,0,0,0,0,0,43,7.166666667,0.234972678,0,0,0,0,8,-7.63,0,0,0,0,0,0,Bajo asignacion,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rex 550,Rex 550,0,63,0.04,2.52,0,0,0,5,5,27,4.5,0.147540984,33.88888889,0,0,0,0,2.52,0,0,0,0,-5,33.88888889,Bajo asignacion,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Rocketman 300 Platinum,Rocketman Racing,46,1995,0.07,139.65,3.035869565,0,0,31,31,95,15.83333333,0.519125683,59.71578947,0,0,15,46,93.65,15,0,1,0.326086957,15,88.61052632,DOH ALTOS se monitorea para asignar mas,15,0,0,0,,15,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ruda 170 F4,Ruda,69,2498,0.02,49.96,0.724057971,0,0,33,33,334,55.66666667,1.825136612,18.08083832,0,0,20,35,14.96,20,0,1,0.289855072,36,29.03892216,No hay proximas llegadas Revisar disponibilidad,20,0,0,0,,20,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Ryder 190,Ryder,99,4390,0.03,131.7,1.33030303,0,0,0,0,474,79,2.590163934,0,0,0,13,99,32.7,99,86,0.131313131,0.131313131,99,38.22151899,Habra cambio de cilindraje a 220 Favor de considerar,14,,,,,13,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Screamer 300 Gris,Screamer,26,346,0.08,27.68,1.064615385,0,0,9,9,72,12,0.393442623,22.875,0,0,2,26,1.68,5,3,0.4,0.076923077,17,35.58333333,0,5,0,0,0,,2,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Screamer Sportivo 300 Azul,Screamer Sportivo,26,1254,0.06,75.24,2.893846154,0,0,12,12,175,29.16666667,0.956284153,12.54857143,0,0,26,26,49.24,26,0,1,1,14,39.73714286,0,26,0,0,0,,26,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Spectra 7i 125,Spectra,36,1792,0.05,89.6,2.488888889,0,0,60,60,291,48.5,1.590163934,37.73195876,0,0,0,0,89.6,0,0,0,0,-24,37.73195876,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Spirit 170,Spirit,22,4094,0.02,81.88,3.721818182,0,0,5,5,222,37,1.213114754,4.121621622,0,0,45,22,59.88,45,0,1,2.045454545,17,41.21621622,0,45,0,0,0,,45,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Storm 300 2.0,Storm,119,1808,0.08,144.64,1.215462185,0,0,73,73,443,73.83333333,2.420765027,30.15575621,0,0,53,46,98.64,46,-7,1.152173913,0.445378151,46,49.15801354,0,53,,,,,53,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Streetrod Rojo 170,Streetrod,13,889,0.04,35.56,2.735384615,0,0,20,20,67,11.16666667,0.366120219,54.62686567,0,0,0,0,35.56,0,0,0,0,-7,54.62686567,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Terra 170 DS,Terra,46,2824,0.04,112.96,2.455652174,0,0,60,60,314,52.33333333,1.715846995,34.96815287,0,0,0,0,112.96,0,0,0,0,-14,34.96815287,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Thriller 250,Thriller,59,1017,0.06,61.02,1.034237288,0,0,3,3,258,43,1.409836066,2.127906977,0,0,0,59,2.02,50,50,0,0,56,37.59302326,No se puede entregar todo para 1ro  se prorratea con llegadas.,0,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Thunderstar 300 S,Thunderstar,69,947,0.06,56.82,0.823478261,0,0,78,78,311,51.83333333,1.699453552,45.89710611,0,0,69,0,56.82,69,0,1,1,-9,86.49839228,0,69,0,0,0,,69,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Tornado 300 Negro,Tornado,95,2925,0.05,146.25,1.539473684,0,0,96,96,361,60.16666667,1.972677596,48.66481994,0,0,0,0,146.25,10,10,0,0,-1,53.73407202,Se consideran 10 pocos arribos,10,0,0,0,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Workman 190,Workman 190,0,16,0.1,1.6,0,0,0,17,17,173,28.83333333,0.945355191,17.98265896,0,0,0,0,1.6,0,0,0,0,-17,17.98265896,0,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Workman 250,Workman 250,46,26,0.06,1.56,0.033913043,0,0,0,0,237,39.5,1.295081967,0,0,0,0,46,-44.44,0,0,0,0,46,0,Arribos hasta octubre,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Xplor 190 Gris,Xplor,59,2255,0.18,405.9,6.879661017,0,0,19,19,351,58.5,1.918032787,9.905982906,0,0,0,60,345.9,0,0,0,0,40,9.905982906,Sin arribos,0,0,0,0,,0,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Xpress Sport 170,Xpress,92,2661,0.02,53.22,0.578478261,0,0,111,111,579,96.5,3.163934426,35.08290155,0,0,92,0,53.22,92,0,1,1,-19,64.16062176,0,92,0,0,0,,92,0,0,0,0,ENTREGADO
DISTRIBUIDORES,Yuma 250,Yuma 250,120,4687,0.04,187.48,1.562333333,0,0,0,0,571,95.16666667,3.120218579,0,0,0,10,120,67.48,130,120,0.076923077,0.083333333,120,41.66374781,0,10,,,,,10,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Ovni 200,Ovni,49,2016,,0,0,0,0,18,18,4,0.666666667,0.021857923,823.5,0,0,0,30,-30,49,49,0,0,31,3065.25,No se puede entregar todo para 1ro  se prorratea con llegadas.,0,,,,,0,0,0,0,0,PENDIENTE
DISTRIBUIDORES,Corsel 300,Corsel 300,,,,0,0,0,0,3,3,41,6.833333333,0.224043716,13.3902439,0,0,4,15,-15,15,11,0.266666667,0,-3,80.34146341,,5,,,,,4,0,0,0,0,PENDIENTE

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
  const required = EXPECTED_COLUMNS.filter(c => c !== "Inventario Cumplido");
  const missing = required.filter(c => !headers.includes(c));
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
      forecast: toNumber(r["FC Septiembre"]),
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
      // "Inventario Cumplido": se resuelve con 3 niveles de respaldo, en este
      // orden, sin inventar ningún valor nuevo — sólo reutilizando datos que
      // ya existen en la base:
      //   1) columna explícita "Inventario Cumplido" (bases antiguas).
      //   2) suma de columnas de semana (36,37,38...) SI aportan algo (>0).
      //   3) "Traslado Completado" — verificado matemáticamente contra esta
      //      base: Pedido Revisado − Traslado Completado = Pendiente por
      //      entregar coincide en el 100% de las filas, por lo que en bases
      //      donde las semanas aún no están capturadas, Traslado Completado
      //      SÍ es el cumplido real.
      inventarioCumplido: (() => {
        if (headers.includes("Inventario Cumplido")) return toNumber(r["Inventario Cumplido"]);
        const sumaSemanas = Object.values(semanas).reduce((a, v) => a + v, 0);
        if (sumaSemanas > 0) return sumaSemanas;
        return toNumber(r["Traslado Completado"]);
      })(),
      estatus: toText(r["ESTATUS"]),
    };
    return rec;
  }).filter(r => r.modelo !== "");

  const weeksAvailable = Array.from(new Set([
    ...cumplidoCols.map(c => c.week),
    ...proyectadoCols.map(c => c.week)
  ])).sort((a, b) => a - b);

  return { data, weeksAvailable, tieneProyeccionSemanal: proyectadoCols.length > 0 };
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
