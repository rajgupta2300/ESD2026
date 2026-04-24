import json
import re
import fitz

doc = fitz.open("e2025F.pdf")
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
    
    # Check for new question e.g. "QUESTION 1:"
    q_match = re.match(r'^QUESTION\s+(\d+):(.*)', line, re.IGNORECASE)
    if q_match:
        if current_q and current_q.get("answer"):
            questions.append(current_q)
        q_num = int(q_match.group(1))
        current_q = {
            "num": q_num,
            "question": q_match.group(2).strip(),
            "options": [],
            "answer": "",
            "explanation": ""
        }
        continue

    if current_q:
        # Check for options A., B., C., D.
        # Ensure it's not matching something inside the question if we haven't seen an option yet
        # Actually it's simple enough:
        opt_match = re.match(r'^([A-D])\.\s*(.*)', line)
        if opt_match:
            current_q["options"].append({
                "id": opt_match.group(1),
                "text": opt_match.group(2).strip()
            })
            continue
            
        # Check for answer Ans. A= ... or Ans. D. ... or Ans. C=
        ans_match = re.search(r'^Ans\.\s*([A-D])(.*)', line, re.IGNORECASE)
        if ans_match:
            current_q["answer"] = ans_match.group(1).upper()
            continue
            
        # Check for Solution
        sol_match = re.match(r'^Solution:(.*)', line, re.IGNORECASE)
        if sol_match:
            current_q["explanation"] = sol_match.group(1).strip()
            continue
            
        # Continuation of previous fields
        if not current_q["options"] and not current_q["answer"]:
            # It's part of the question. Don't add 'Q1. ' if it's there
            # Strip 'Q1. ' from beginning of line if it exists
            line_no_prefix = re.sub(r'^Q\d+\.\s*', '', line)
            if current_q["question"]:
                current_q["question"] += " " + line_no_prefix
            else:
                current_q["question"] = line_no_prefix
        elif current_q["options"] and not current_q["answer"]:
            # append to last option
            current_q["options"][-1]["text"] += " " + line
        elif current_q["answer"] and not current_q["explanation"]:
            if not line.lower().startswith("ans"):
                pass # might be junk
        elif current_q["explanation"]:
            # ignore END or similar
            if "END" not in line and "******" not in line and "NPTEL" not in line and "Indian Institute" not in line:
                current_q["explanation"] += " " + line

if current_q and current_q.get("answer"):
    questions.append(current_q)

# Fix question texts sometimes being empty or starting weirdly
structured = []
week_num = 1
temp_qs = []
for q in questions:
    if len(temp_qs) == 10:
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

with open("js/questions_2025.js", "w", encoding="utf-8") as f:
    f.write("const weekData2025 = " + json.dumps(structured, indent=2) + ";\n")

print(f"Extracted {len(questions)} individual questions over {len(structured)} weeks.")
