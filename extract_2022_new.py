import fitz
import re
import json

doc = fitz.open("ESD_All_120_Questions_Corrected.pdf")
text = ""
for page in doc:
    text += page.get_text() + "\n"

lines = text.split('\n')
questions = []
current_q = None

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    # Ignore headers/footers
    if "Education for Sustainable Development" in line or "NPTEL" in line or line.startswith("Week "):
        continue
        
    q_match = re.match(r'^Q(\d+)\.(.*)', line, re.IGNORECASE)
    if q_match:
        if current_q and current_q.get("answer"):
            questions.append(current_q)
        current_q = {
            "num": int(q_match.group(1)),
            "question": q_match.group(2).strip(),
            "options": [],
            "answer": "",
            "explanation": ""
        }
        continue
        
    if current_q:
        opt_match = re.match(r'^([A-E])\.\s*(.*)', line, re.IGNORECASE)
        if opt_match:
            current_q["options"].append({
                "id": opt_match.group(1).upper(),
                "text": opt_match.group(2).strip()
            })
            continue
            
        ans_match = re.search(r'Correct Answer:\s*([A-E])\.', line, re.IGNORECASE)
        if ans_match:
            current_q["answer"] = ans_match.group(1).upper()
            continue
            
        # Continuation
        if not current_q["options"] and not current_q["answer"]:
            # Continuation of question
            if current_q["question"]:
                current_q["question"] += " " + line
            else:
                current_q["question"] = line
        elif current_q["options"] and not current_q["answer"]:
            # Continuation of last option
            current_q["options"][-1]["text"] += " " + line

if current_q and current_q.get("answer"):
    questions.append(current_q)

print(f"Parsed {len(questions)} questions")

# Format into weeks
structured = []
week_num = 0
temp_qs = []
for q in questions:
    if q["num"] == 1:
        if temp_qs:
            structured.append({"week": week_num, "questions": temp_qs})
        week_num += 1
        temp_qs = []
        
    temp_qs.append({
        "question": q["question"],
        "options": q["options"],
        "answer_id": q["answer"],
        "explanation": q["explanation"]
    })

if temp_qs:
    structured.append({"week": week_num, "questions": temp_qs})

with open("js/questions_2022.js", "w", encoding="utf-8") as f:
    f.write("const weekData2022 = " + json.dumps(structured, indent=2) + ";\n")

print(f"Extracted {len(questions)} individual questions over {len(structured)} weeks.")
