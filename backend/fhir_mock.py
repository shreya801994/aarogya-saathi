def fetch_mock_fhir_bundle(abha_id: str) -> dict:
    if "2222" in abha_id:
        return {
            "resourceType": "Bundle",
            "entry": [
                {"resource": {"resourceType": "Patient", "id": abha_id,
                    "name": [{"text": "Anil Sharma"}], "gender": "male"}},
                {"resource": {"resourceType": "Condition",
                    "clinicalStatus": {"coding": [{"code": "active"}]},
                    "code": {"coding": [{"display": "Coronary artery disease"}]}}},
                {"resource": {"resourceType": "AllergyIntolerance",
                    "criticality": "high",
                    "code": {"coding": [{"display": "Aspirin"}]}}},
                {"resource": {"resourceType": "Observation", "status": "final",
                    "code": {"coding": [{"display": "Heart rate"}]},
                    "valueQuantity": {"value": 110, "unit": "beats/minute"}}}
            ]
        }
    elif "3333" in abha_id:
        return {
            "resourceType": "Bundle",
            "entry": [
                {"resource": {"resourceType": "Patient", "id": abha_id,
                    "name": [{"text": "Priya Patel"}], "gender": "female"}},
                {"resource": {"resourceType": "Condition",
                    "clinicalStatus": {"coding": [{"code": "active"}]},
                    "code": {"coding": [{"display": "Type 2 Diabetes Mellitus"}]}}},
                {"resource": {"resourceType": "Observation", "status": "final",
                    "code": {"coding": [{"display": "Fasting Blood Glucose"}]},
                    "valueQuantity": {"value": 180, "unit": "mg/dL"}}}
            ]
        }
    return {
        "resourceType": "Bundle",
        "entry": [
            {"resource": {"resourceType": "Patient", "id": abha_id,
                "name": [{"text": "Ramesh Kumar"}], "gender": "male"}},
            {"resource": {"resourceType": "Condition",
                "clinicalStatus": {"coding": [{"code": "active"}]},
                "code": {"coding": [{"display": "Asthma"}]}}},
            {"resource": {"resourceType": "AllergyIntolerance",
                "criticality": "high",
                "code": {"coding": [{"display": "Penicillin"}]}}},
            {"resource": {"resourceType": "Observation", "status": "final",
                "code": {"coding": [{"display": "Blood pressure"}]},
                "component": [
                    {"code": {"text": "Systolic"}, "valueQuantity": {"value": 155}},
                    {"code": {"text": "Diastolic"}, "valueQuantity": {"value": 95}}
                ]}}
        ]
    }