import requests

BASE = "http://127.0.0.1:8000"

def send_classify(message: str):
    """Call /classify"""
    res = requests.post(f"{BASE}/classify", json={"message": message})
    return res.json()



def send_manual_category(payload: dict):
    """Call /manual-category"""
    res = requests.post(f"{BASE}/manual-category", json=payload)
    return res.json()


def send_add_category(category: str):
    """Call /add-category"""
    res = requests.post(f"{BASE}/add-category", json={"category": category})
    return res.json()


def start():
    print("\n==============================")
    print("      TransactAI Tester")
    print("==============================\n")

    while True:
        message = input("\nEnter transaction message (or 'exit'): ")

        if message.lower() == "exit":
            print("Goodbye!")
            break

        # ----------------------------------------------------
        # STEP 1: CALL CLASSIFY
        # ----------------------------------------------------
        response = send_classify(message)
        print("\nAPI Response:", response)

        # High confidence → DONE
        if response["status"] == "saved":
            print("\n✔ AUTO-CATEGORIZED!")
            print("Category :", response["category"])
            print("Confidence :", response["confidence"])
            continue

        # ----------------------------------------------------
        # STEP 2: HANDLE LOW CONFIDENCE
        # ----------------------------------------------------
        clean_text = response["clean_text"]
        amount = response["amount"]
        receiver = response["receiver"]
        options = response["options"]

        print("\n⚠ Low confidence. Please choose the correct category:\n")
        for i, opt in enumerate(options):
            print(f"{i+1}. {opt}")
        print("N. Add NEW category")

        choice = input("\nEnter option number: ")

        if choice.lower() == "n":
            # -----------------------------------------------
            # STEP 3: ADD NEW CATEGORY
            # -----------------------------------------------
            new_cat = input("Enter new category name: ").strip()
            print("\nAdding new category...")
            add_res = send_add_category(new_cat)
            print("Add Category Response:", add_res)
            final_category = new_cat

        else:
            try:
                idx = int(choice) - 1
                final_category = options[idx]
            except:
                print("Invalid choice! Try again.")
                continue

        # ----------------------------------------------------
        # STEP 4: SAVE MANUAL CATEGORY + FEEDBACK
        # ----------------------------------------------------
        payload = {
            "message": message,
            "category": final_category,
            "amount": amount,
            "receiver": receiver,
            "clean_text": clean_text
        }

        print("\nSaving manual category...")
        manual_res = send_manual_category(payload)
        print("Manual Response:", manual_res)

        print("\n✔ FEEDBACK SAVED + TRANSACTION STORED!\n")


if __name__ == "__main__":
    start()
