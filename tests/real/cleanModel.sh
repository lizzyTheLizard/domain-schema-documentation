#!/bin/bash

rm -rf model
cp -r original/model model

#Rename old staff
sed -i -e 's/x-misng-kind: aggregate/x-schema-type: Aggregate/g' model/*/*.y*ml
sed -i -e 's/x-misng-kind: entity/x-schema-type: Entity/g' model/*/*.y*ml
sed -i -e 's/x-misng-kind: enum/x-schema-type: ValueObject/g' model/*/*.y*ml
sed -i -e 's/x-misng-kind: metadata/x-schema-type: ReferenceData/g' model/*/*.y*ml
sed -i -e 's/x-misng-kind: dto/x-schema-type: Other/g' model/*/*.y*ml
sed -i -e 's/x-misng-kind/x-schema-type/g' model/*/*.y*ml
sed -i -e 's/x-misng-references/x-references/g' model/*/*.y*ml
sed -i -e 's/x-misng-enumdesc/x-enum-description/g' model/*/*.y*ml

# Use const instead of a single enum
sed -i -e 's/enum: \[\(.*\)\]/const: \1/g' model/*/*.y*ml

#Fix wrong examples in AuditLogEntry
sed -i -e 's/referenzen:/references:/g' model/Audit/AuditLogEntry.yml
sed -i -e 's/objektUId:/referenceUId:/g' model/Audit/AuditLogEntry.yml

#Fix wrong example in Firma
sed -i -e 's/fachbereich: "Sparte 1"/sparteUId: Spt-1/g' model/Partner/Firma.yml
sed -i -e 's/industriePracticeId/industriePracticeUId/g' model/Partner/Firma.yml
sed -i -e 's/ertragsPotenzialId/ertragsPotenzialUId/g' model/Partner/Firma.yml
#Delete "potenzial"
sed -i '23,27d' model/Partner/Firma.yml

#Fix wrong example in Person
sed -i -e 's/betreuer/betreuerUId/g' model/Partner/Person.yml
sed -i -e 's/kesslerUnitId: "10A"/kesslerUnitUId: "KU-10A"/g' model/Partner/Person.yml
#Delete mkz
sed -i '64d' model/Partner/Person.yml

#Fix wrong type:string in $ref
sed -i '114d' model/Vereinbarung/Praemienfluss.yml 

#Fix missing type in PoliceSearchResponseFirma
sed -i '6i x-schema-type: Other'  model/Search/PoliceSearchResponseFirma.yml

#Fix example in HealthStatus
sed -i '158i \ \ \ \ additionalProperties: true'  model/Client/HealthStatus.yml

#Top-Level-Array not supported => This must be added to the openapi
rm model/Search/SchnellsucheResponse.yml

# Missing application file
printf "title: Real wold example\ndescription: This is a real world example"> model/index.yml

#Missing module files
for dir in `find model -mindepth 1 -type d`
do
    id=${dir:5}
    name=${dir:6}
    printf "\$id: $id\ntitle: $name\ndescription: Module $name"> $dir/index.yml
done

