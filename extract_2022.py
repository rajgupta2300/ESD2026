import json
import re

with open("test_ocr4_out.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.split('\n')
questions = []
current_q = None
parsing_state = None 

for line in lines:
    line = line.strip()
    if not line: continue
    
    # Matches "1)", "1 ", "10 " etc
    q_match = re.match(r'^(\d+)[\)\s]+(.*)', line)
    # Filter out if it's just a number with no text or something that looks like an option
    if q_match and len(q_match.group(2).strip()) > 5:
        # Avoid matching random "1 point" lines or similar
        if not re.match(r'^[A-E]\.', q_match.group(2)):
            if current_q:
                questions.append(current_q)
            q_text = q_match.group(2).replace("1 point", "").strip()
            current_q = {
                "num": int(q_match.group(1)),
                "question": q_text,
                "options": [],
                "answer_text": "",
                "explanation": ""
            }
            parsing_state = "question"
            continue

    if current_q:
        if "Accepted Answers:" in line or "Accepted A Answers:" in line or "Accepted D. Answers:" in line:
            parsing_state = "answer"
            continue
            
        if parsing_state == "answer":
            if line.startswith("Solution:") or line.startswith("Sol:"):
                parsing_state = "explanation"
                current_q["explanation"] = line.split(":", 1)[1].strip()
            else:
                ans_m = re.match(r'^([A-E])[\.\s]+(.*)', line, re.IGNORECASE)
                if ans_m:
                    current_q["answer_text"] = ans_m.group(2).strip()
                    current_q["answer_id"] = ans_m.group(1).upper()
                elif line.strip() and not current_q.get("answer_text"):
                    current_q["answer_text"] = line.strip()
            continue
            
        if parsing_state == "explanation":
             current_q["explanation"] += " " + line
             continue

        # Options
        if re.search(r'\b[A-E]\.', line):
            parsing_state = "options"
            opt_matches = list(re.finditer(r'\b([A-E])\.\s*', line))
            if opt_matches:
                for i in range(len(opt_matches)):
                    opt_id = opt_matches[i].group(1).upper()
                    start_idx = opt_matches[i].end()
                    end_idx = opt_matches[i+1].start() if i + 1 < len(opt_matches) else len(line)
                    opt_text = line[start_idx:end_idx].strip()
                    if opt_text:
                        current_q["options"].append({
                            "id": opt_id,
                            "text": opt_text
                        })
                continue

        opt_match_ocr = re.match(r'^([©])\.\s*(.*)', line, re.IGNORECASE)
        if opt_match_ocr:
             parsing_state = "options"
             current_q["options"].append({
                 "id": "C",
                 "text": opt_match_ocr.group(2).strip()
             })
             continue

        # Continuation
        if parsing_state == "question":
             if line.startswith("No, the answer") or line.startswith("Score:") or line.startswith("1 point"):
                 continue
             current_q["question"] += " " + line.replace("1 point", "").strip()
        elif parsing_state == "options" and len(current_q["options"]) > 0:
             if line.startswith("No, the answer") or line.startswith("Score:") or line.startswith("VIDEOS") or re.match(r'^[A-E]\s+[a-e]\.$', line):
                 continue
             current_q["options"][-1]["text"] += " " + line

if current_q:
    questions.append(current_q)

structured = []
week_num = 1
temp_qs = []
for q in questions:
    if len(temp_qs) == 10:
        structured.append({"week": week_num, "questions": temp_qs})
        week_num += 1
        temp_qs = []
    
    ans_id = q.get("answer_id", "A")
    ans_text = q.get("answer_text", "")
    
    temp_qs.append({
        "question": q["question"],
        "options": q["options"],
        "answer_id": ans_id,
        "explanation": q["explanation"]
    })

if temp_qs:
    structured.append({"week": week_num, "questions": temp_qs})

with open("js/questions_2022.js", "w", encoding="utf-8") as f:
    f.write("const weekData2022 = " + json.dumps(structured, indent=2) + ";\n")

print(f"Extracted {len(questions)} individual questions over {len(structured)} weeks.")
