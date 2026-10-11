BEGIN;
-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleId" UUID, ADD COLUMN "phoneCountryCode" VARCHAR(3);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "hierarchyLevel" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" UUID NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(150) NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citizen" (
    "userId" UUID NOT NULL,
    "municipalityId" UUID NOT NULL,

    CONSTRAINT "Citizen_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AdministrativeStaff" (
    "userId" UUID NOT NULL,
    "street" VARCHAR(150) NOT NULL,
    "exteriorNumber" VARCHAR(20) NOT NULL,
    "interiorNumber" VARCHAR(20),
    "neighborhood" VARCHAR(150) NOT NULL,
    "postalCode" VARCHAR(5) NOT NULL,
    "socialSecurityNumber" VARCHAR(11) NOT NULL,

    CONSTRAINT "AdministrativeStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CounterStaff" (
    "userId" UUID NOT NULL,

    CONSTRAINT "CounterStaff_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "CounterHead" (
    "userId" UUID NOT NULL,

    CONSTRAINT "CounterHead_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DepartmentHead" (
    "userId" UUID NOT NULL,

    CONSTRAINT "DepartmentHead_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "municipalityId" UUID NOT NULL,
    "counterHeadId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "street" VARCHAR(150) NOT NULL,
    "exteriorNumber" VARCHAR(20) NOT NULL,
    "interiorNumber" VARCHAR(20),
    "neighborhood" VARCHAR(150) NOT NULL,
    "postalCode" VARCHAR(5) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCounter" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(150) NOT NULL,
    "requirements" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "estimatedMinutes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchProcedure" (
    "branchId" UUID NOT NULL,
    "procedureId" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BranchProcedure_pkey" PRIMARY KEY ("branchId","procedureId")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "startsAt" TIME(0) NOT NULL,
    "endsAt" TIME(0) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "occupied" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "folio" VARCHAR(100) NOT NULL,
    "citizenId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "procedureId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "counterId" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(100) NOT NULL,
    "qrToken" TEXT NOT NULL,
    "occupiesCapacity" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "counterId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "counterId" UUID NOT NULL,
    "arrivedAt" TIMESTAMP(3) NOT NULL,
    "qrValidatedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "late" BOOLEAN NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureRecord" (
    "id" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalStatus" VARCHAR(100) NOT NULL,
    "observations" TEXT,

    CONSTRAINT "ProcedureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "channel" VARCHAR(100) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_code_key" ON "Municipality"("code");

-- CreateIndex
CREATE INDEX "Citizen_municipalityId_idx" ON "Citizen"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeStaff_socialSecurityNumber_key" ON "AdministrativeStaff"("socialSecurityNumber");

-- CreateIndex
CREATE INDEX "Branch_municipalityId_idx" ON "Branch"("municipalityId");

-- CreateIndex
CREATE INDEX "Branch_counterHeadId_idx" ON "Branch"("counterHeadId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCounter_branchId_number_key" ON "ServiceCounter"("branchId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCounter_id_branchId_key" ON "ServiceCounter"("id", "branchId");

-- CreateIndex
CREATE INDEX "BranchProcedure_procedureId_idx" ON "BranchProcedure"("procedureId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_id_branchId_key" ON "TimeSlot"("id", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_branchId_date_startsAt_endsAt_key" ON "TimeSlot"("branchId", "date", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_folio_key" ON "Appointment"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_qrToken_key" ON "Appointment"("qrToken");

-- CreateIndex
CREATE INDEX "Appointment_citizenId_scheduledAt_idx" ON "Appointment"("citizenId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_branchId_procedureId_idx" ON "Appointment"("branchId", "procedureId");

-- CreateIndex
CREATE INDEX "Appointment_slotId_branchId_idx" ON "Appointment"("slotId", "branchId");

-- CreateIndex
CREATE INDEX "Appointment_counterId_branchId_idx" ON "Appointment"("counterId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_branchId_key" ON "Appointment"("id", "branchId");

-- CreateIndex
CREATE INDEX "StaffAssignment_staffId_startsAt_idx" ON "StaffAssignment"("staffId", "startsAt");

-- CreateIndex
CREATE INDEX "StaffAssignment_counterId_startsAt_idx" ON "StaffAssignment"("counterId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_appointmentId_key" ON "Attendance"("appointmentId");

-- CreateIndex
CREATE INDEX "Attendance_staffId_idx" ON "Attendance"("staffId");

-- CreateIndex
CREATE INDEX "Attendance_counterId_branchId_idx" ON "Attendance"("counterId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_appointmentId_branchId_key" ON "Attendance"("appointmentId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureRecord_attendanceId_key" ON "ProcedureRecord"("attendanceId");

-- CreateIndex
CREATE INDEX "Notification_appointmentId_createdAt_idx" ON "Notification"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citizen" ADD CONSTRAINT "Citizen_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeStaff" ADD CONSTRAINT "AdministrativeStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterStaff" ADD CONSTRAINT "CounterStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdministrativeStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterHead" ADD CONSTRAINT "CounterHead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdministrativeStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentHead" ADD CONSTRAINT "DepartmentHead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdministrativeStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_counterHeadId_fkey" FOREIGN KEY ("counterHeadId") REFERENCES "CounterHead"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCounter" ADD CONSTRAINT "ServiceCounter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProcedure" ADD CONSTRAINT "BranchProcedure_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProcedure" ADD CONSTRAINT "BranchProcedure_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "Citizen"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_procedureId_fkey" FOREIGN KEY ("branchId", "procedureId") REFERENCES "BranchProcedure"("branchId", "procedureId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_branchId_fkey" FOREIGN KEY ("slotId", "branchId") REFERENCES "TimeSlot"("id", "branchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_counterId_branchId_fkey" FOREIGN KEY ("counterId", "branchId") REFERENCES "ServiceCounter"("id", "branchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "CounterStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "ServiceCounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_appointmentId_branchId_fkey" FOREIGN KEY ("appointmentId", "branchId") REFERENCES "Appointment"("id", "branchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "CounterStaff"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_counterId_branchId_fkey" FOREIGN KEY ("counterId", "branchId") REFERENCES "ServiceCounter"("id", "branchId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureRecord" ADD CONSTRAINT "ProcedureRecord_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Municipality" (id, code, name) VALUES
(md5('inegi:' || '07001')::uuid, '07001', 'Acacoyagua'),
(md5('inegi:' || '07002')::uuid, '07002', 'Acala'),
(md5('inegi:' || '07003')::uuid, '07003', 'Acapetahua'),
(md5('inegi:' || '07113')::uuid, '07113', 'Aldama'),
(md5('inegi:' || '07004')::uuid, '07004', 'Altamirano'),
(md5('inegi:' || '07005')::uuid, '07005', 'Amatán'),
(md5('inegi:' || '07006')::uuid, '07006', 'Amatenango de la Frontera'),
(md5('inegi:' || '07007')::uuid, '07007', 'Amatenango del Valle'),
(md5('inegi:' || '07008')::uuid, '07008', 'Ángel Albino Corzo'),
(md5('inegi:' || '07009')::uuid, '07009', 'Arriaga'),
(md5('inegi:' || '07010')::uuid, '07010', 'Bejucal de Ocampo'),
(md5('inegi:' || '07011')::uuid, '07011', 'Bella Vista'),
(md5('inegi:' || '07114')::uuid, '07114', 'Benemérito de las Américas'),
(md5('inegi:' || '07012')::uuid, '07012', 'Berriozábal'),
(md5('inegi:' || '07013')::uuid, '07013', 'Bochil'),
(md5('inegi:' || '07015')::uuid, '07015', 'Cacahoatán'),
(md5('inegi:' || '07120')::uuid, '07120', 'Capitán Luis Ángel Vidal'),
(md5('inegi:' || '07016')::uuid, '07016', 'Catazajá'),
(md5('inegi:' || '07022')::uuid, '07022', 'Chalchihuitán'),
(md5('inegi:' || '07023')::uuid, '07023', 'Chamula'),
(md5('inegi:' || '07024')::uuid, '07024', 'Chanal'),
(md5('inegi:' || '07025')::uuid, '07025', 'Chapultenango'),
(md5('inegi:' || '07026')::uuid, '07026', 'Chenalhó'),
(md5('inegi:' || '07027')::uuid, '07027', 'Chiapa de Corzo'),
(md5('inegi:' || '07028')::uuid, '07028', 'Chiapilla'),
(md5('inegi:' || '07029')::uuid, '07029', 'Chicoasén'),
(md5('inegi:' || '07030')::uuid, '07030', 'Chicomuselo'),
(md5('inegi:' || '07031')::uuid, '07031', 'Chilón'),
(md5('inegi:' || '07017')::uuid, '07017', 'Cintalapa de Figueroa'),
(md5('inegi:' || '07018')::uuid, '07018', 'Coapilla'),
(md5('inegi:' || '07019')::uuid, '07019', 'Comitán de Domínguez'),
(md5('inegi:' || '07021')::uuid, '07021', 'Copainalá'),
(md5('inegi:' || '07014')::uuid, '07014', 'El Bosque'),
(md5('inegi:' || '07122')::uuid, '07122', 'El Parral'),
(md5('inegi:' || '07070')::uuid, '07070', 'El Porvenir'),
(md5('inegi:' || '07123')::uuid, '07123', 'Emiliano Zapata'),
(md5('inegi:' || '07032')::uuid, '07032', 'Escuintla'),
(md5('inegi:' || '07033')::uuid, '07033', 'Francisco León'),
(md5('inegi:' || '07034')::uuid, '07034', 'Frontera Comalapa'),
(md5('inegi:' || '07035')::uuid, '07035', 'Frontera Hidalgo'),
(md5('inegi:' || '07125')::uuid, '07125', 'Honduras de la Sierra'),
(md5('inegi:' || '07037')::uuid, '07037', 'Huehuetán'),
(md5('inegi:' || '07039')::uuid, '07039', 'Huitiupán'),
(md5('inegi:' || '07038')::uuid, '07038', 'Huixtán'),
(md5('inegi:' || '07040')::uuid, '07040', 'Huixtla'),
(md5('inegi:' || '07042')::uuid, '07042', 'Ixhuatán'),
(md5('inegi:' || '07043')::uuid, '07043', 'Ixtacomitán'),
(md5('inegi:' || '07044')::uuid, '07044', 'Ixtapa'),
(md5('inegi:' || '07045')::uuid, '07045', 'Ixtapangajoya'),
(md5('inegi:' || '07046')::uuid, '07046', 'Jiquipilas'),
(md5('inegi:' || '07047')::uuid, '07047', 'Jitotol'),
(md5('inegi:' || '07048')::uuid, '07048', 'Juárez'),
(md5('inegi:' || '07020')::uuid, '07020', 'La Concordia'),
(md5('inegi:' || '07036')::uuid, '07036', 'La Grandeza'),
(md5('inegi:' || '07041')::uuid, '07041', 'La Independencia'),
(md5('inegi:' || '07050')::uuid, '07050', 'La Libertad'),
(md5('inegi:' || '07099')::uuid, '07099', 'La Trinitaria'),
(md5('inegi:' || '07049')::uuid, '07049', 'Larráinzar'),
(md5('inegi:' || '07052')::uuid, '07052', 'Las Margaritas'),
(md5('inegi:' || '07075')::uuid, '07075', 'Las Rosas'),
(md5('inegi:' || '07051')::uuid, '07051', 'Mapastepec'),
(md5('inegi:' || '07115')::uuid, '07115', 'Maravilla Tenejapa'),
(md5('inegi:' || '07116')::uuid, '07116', 'Marqués de Comillas'),
(md5('inegi:' || '07053')::uuid, '07053', 'Mazapa de Madero'),
(md5('inegi:' || '07054')::uuid, '07054', 'Mazatán'),
(md5('inegi:' || '07055')::uuid, '07055', 'Metapa'),
(md5('inegi:' || '07124')::uuid, '07124', 'Mezcalapa'),
(md5('inegi:' || '07056')::uuid, '07056', 'Mitontic'),
(md5('inegi:' || '07117')::uuid, '07117', 'Montecristo de Guerrero'),
(md5('inegi:' || '07057')::uuid, '07057', 'Motozintla'),
(md5('inegi:' || '07058')::uuid, '07058', 'Nicolás Ruíz'),
(md5('inegi:' || '07059')::uuid, '07059', 'Ocosingo'),
(md5('inegi:' || '07060')::uuid, '07060', 'Ocotepec'),
(md5('inegi:' || '07061')::uuid, '07061', 'Ocozocoautla de Espinosa'),
(md5('inegi:' || '07062')::uuid, '07062', 'Ostuacán'),
(md5('inegi:' || '07063')::uuid, '07063', 'Osumacinta'),
(md5('inegi:' || '07064')::uuid, '07064', 'Oxchuc'),
(md5('inegi:' || '07065')::uuid, '07065', 'Palenque'),
(md5('inegi:' || '07066')::uuid, '07066', 'Pantelhó'),
(md5('inegi:' || '07067')::uuid, '07067', 'Pantepec'),
(md5('inegi:' || '07068')::uuid, '07068', 'Pichucalco'),
(md5('inegi:' || '07069')::uuid, '07069', 'Pijijiapan'),
(md5('inegi:' || '07072')::uuid, '07072', 'Pueblo Nuevo Solistahuacán'),
(md5('inegi:' || '07073')::uuid, '07073', 'Rayón'),
(md5('inegi:' || '07074')::uuid, '07074', 'Reforma'),
(md5('inegi:' || '07121')::uuid, '07121', 'Rincón Chamula San Pedro'),
(md5('inegi:' || '07076')::uuid, '07076', 'Sabanilla'),
(md5('inegi:' || '07077')::uuid, '07077', 'Salto de Agua'),
(md5('inegi:' || '07118')::uuid, '07118', 'San Andrés Duraznal'),
(md5('inegi:' || '07078')::uuid, '07078', 'San Cristóbal de las Casas'),
(md5('inegi:' || '07079')::uuid, '07079', 'San Fernando'),
(md5('inegi:' || '07112')::uuid, '07112', 'San Juan Cancuc'),
(md5('inegi:' || '07110')::uuid, '07110', 'San Lucas'),
(md5('inegi:' || '07119')::uuid, '07119', 'Santiago el Pinar'),
(md5('inegi:' || '07080')::uuid, '07080', 'Siltepec'),
(md5('inegi:' || '07081')::uuid, '07081', 'Simojovel'),
(md5('inegi:' || '07082')::uuid, '07082', 'Sitalá'),
(md5('inegi:' || '07083')::uuid, '07083', 'Socoltenango'),
(md5('inegi:' || '07084')::uuid, '07084', 'Solosuchiapa'),
(md5('inegi:' || '07085')::uuid, '07085', 'Soyaló'),
(md5('inegi:' || '07086')::uuid, '07086', 'Suchiapa'),
(md5('inegi:' || '07087')::uuid, '07087', 'Suchiate'),
(md5('inegi:' || '07088')::uuid, '07088', 'Sunuapa'),
(md5('inegi:' || '07089')::uuid, '07089', 'Tapachula'),
(md5('inegi:' || '07090')::uuid, '07090', 'Tapalapa'),
(md5('inegi:' || '07091')::uuid, '07091', 'Tapilula'),
(md5('inegi:' || '07092')::uuid, '07092', 'Tecpatán'),
(md5('inegi:' || '07093')::uuid, '07093', 'Tenejapa'),
(md5('inegi:' || '07094')::uuid, '07094', 'Teopisca'),
(md5('inegi:' || '07096')::uuid, '07096', 'Tila'),
(md5('inegi:' || '07097')::uuid, '07097', 'Tonalá'),
(md5('inegi:' || '07098')::uuid, '07098', 'Totolapa'),
(md5('inegi:' || '07100')::uuid, '07100', 'Tumbalá'),
(md5('inegi:' || '07102')::uuid, '07102', 'Tuxtla Chico'),
(md5('inegi:' || '07101')::uuid, '07101', 'Tuxtla Gutiérrez'),
(md5('inegi:' || '07103')::uuid, '07103', 'Tuzantán'),
(md5('inegi:' || '07104')::uuid, '07104', 'Tzimol'),
(md5('inegi:' || '07105')::uuid, '07105', 'Unión Juárez'),
(md5('inegi:' || '07106')::uuid, '07106', 'Venustiano Carranza'),
(md5('inegi:' || '07071')::uuid, '07071', 'Villa Comaltitlán'),
(md5('inegi:' || '07107')::uuid, '07107', 'Villa Corzo'),
(md5('inegi:' || '07108')::uuid, '07108', 'Villaflores'),
(md5('inegi:' || '07109')::uuid, '07109', 'Yajalón'),
(md5('inegi:' || '07111')::uuid, '07111', 'Zinacantán');
INSERT INTO "Role" (id, code, name, active) VALUES
(md5('role:' || 'CITIZEN')::uuid, 'CITIZEN', 'Ciudadano', true),
(md5('role:' || 'COUNTER_STAFF')::uuid, 'COUNTER_STAFF', 'Personal de ventanilla', true),
(md5('role:' || 'COUNTER_HEAD')::uuid, 'COUNTER_HEAD', 'Jefe de ventanilla', true),
(md5('role:' || 'DEPARTMENT_HEAD')::uuid, 'DEPARTMENT_HEAD', 'Jefe de departamento', true);

-- Toda la conversión se revierte ante una cuenta cuyo municipio no sea inequívoco.
DO $$
BEGIN
  IF EXISTS (SELECT FROM "User" u WHERE NOT EXISTS (
    SELECT FROM "Municipality" m
    WHERE (u."municipalityCode" IS NULL OR u."municipalityCode" = m.code)
      AND lower(translate(btrim(u.municipality), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) =
          lower(translate(m.name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))
  )) THEN RAISE EXCEPTION 'Hay cuentas con municipio desconocido o código/nombre contradictorios; requiere revisión antes de migrar.'; END IF;
END $$;
INSERT INTO "Citizen" ("userId", "municipalityId")
SELECT u.id, m.id FROM "User" u JOIN "Municipality" m
ON (u."municipalityCode" IS NULL OR u."municipalityCode" = m.code)
AND lower(translate(btrim(u.municipality), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) =
    lower(translate(m.name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));
UPDATE "User" u SET "roleId" = (SELECT id FROM "Role" WHERE code = 'CITIZEN'),
  "municipalityCode" = m.code, municipality = m.name
FROM "Citizen" c JOIN "Municipality" m ON m.id = c."municipalityId" WHERE u.id = c."userId";
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
CREATE UNIQUE INDEX "User_rfc_key" ON "User"(rfc);

ALTER TABLE "Municipality" ADD CONSTRAINT municipality_code CHECK (code ~ '^07[0-9]{3}$');
ALTER TABLE "User" ADD CONSTRAINT user_curp_format CHECK (curp ~ '^[A-Z][AEIOU][A-Z]{2}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$'),
  ADD CONSTRAINT user_names CHECK (char_length(btrim("firstName")) > 0 AND char_length(btrim("lastName")) > 0),
  ADD CONSTRAINT user_phone_digits CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),
  ADD CONSTRAINT user_country_code CHECK ("phoneCountryCode" IS NULL OR "phoneCountryCode" ~ '^[1-9][0-9]{0,2}$'),
  ADD CONSTRAINT user_rfc_format CHECK (rfc IS NULL OR rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$');
ALTER TABLE "AdministrativeStaff" ADD CONSTRAINT staff_postal CHECK ("postalCode" ~ '^[0-9]{5}$'),
  ADD CONSTRAINT staff_social_security CHECK ("socialSecurityNumber" ~ '^[0-9]{11}$');
ALTER TABLE "Branch" ADD CONSTRAINT branch_postal CHECK ("postalCode" ~ '^[0-9]{5}$'),
  ADD CONSTRAINT branch_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND latitude IS NOT NULL AND longitude IS NOT NULL));
ALTER TABLE "ServiceCounter" ADD CONSTRAINT counter_positive CHECK (number > 0);
ALTER TABLE "Procedure" ADD CONSTRAINT procedure_cost CHECK (cost IS NULL OR cost >= 0),
  ADD CONSTRAINT procedure_minutes CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0);
ALTER TABLE "TimeSlot" ADD CONSTRAINT slot_interval CHECK ("startsAt" < "endsAt"),
  ADD CONSTRAINT slot_capacity CHECK (capacity > 0 AND occupied >= 0 AND occupied <= capacity);
ALTER TABLE "StaffAssignment" ADD CONSTRAINT assignment_interval CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");
ALTER TABLE "Attendance" ADD CONSTRAINT attendance_interval CHECK (
  ("qrValidatedAt" IS NULL OR "qrValidatedAt" >= "arrivedAt") AND
  ("startedAt" IS NULL OR "startedAt" >= "arrivedAt") AND
  ("endedAt" IS NULL OR ("startedAt" IS NOT NULL AND "endedAt" >= "startedAt")));

-- El contador es derivado: incluso una inserción directa en pgAdmin debe reservar
-- capacidad dentro de la misma transacción. UPDATE bloquea la fila del cupo.
CREATE FUNCTION maintain_slot_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE slot_id uuid; delta integer;
BEGIN
  -- Bloquear ambos cupos en orden estable al mover una cita evita interbloqueos.
  IF TG_OP = 'UPDATE' THEN
    PERFORM id FROM "TimeSlot" WHERE id IN (OLD."slotId", NEW."slotId") ORDER BY id FOR UPDATE;
  END IF;
  IF TG_OP <> 'INSERT' AND OLD."occupiesCapacity" THEN
    UPDATE "TimeSlot" SET occupied = occupied - 1 WHERE id = OLD."slotId";
  END IF;
  IF TG_OP <> 'DELETE' AND NEW."occupiesCapacity" THEN
    UPDATE "TimeSlot" SET occupied = occupied + 1 WHERE id = NEW."slotId" AND active AND occupied < capacity;
    IF NOT FOUND THEN RAISE EXCEPTION 'El cupo no está activo o ya no tiene disponibilidad.' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER appointment_capacity AFTER INSERT OR DELETE OR UPDATE OF "slotId", "occupiesCapacity"
ON "Appointment" FOR EACH ROW EXECUTE FUNCTION maintain_slot_capacity();

-- No permitir falsificar el contador mediante UPDATE directo.
CREATE FUNCTION protect_slot_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() < 2 AND NEW.occupied <> (CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE OLD.occupied END) THEN
    RAISE EXCEPTION 'occupied es un valor derivado de las citas.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER slot_count_guard BEFORE INSERT OR UPDATE OF occupied ON "TimeSlot"
FOR EACH ROW EXECUTE FUNCTION protect_slot_count();

COMMIT;
