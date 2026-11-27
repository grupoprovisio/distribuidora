import assert from "node:assert/strict";
import test from "node:test";
import { COMMERCIAL_EMAIL, CONTACT_TOPICS, prepareContactEmail } from "../lib/commercial-contact.ts";

function createFields(topic, message = "Cotação: detergente & café?\nFim #1") {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: "  Beatriz  ", contact: "teste@example.invalid", topic, message })) {
    data.set(key, value);
  }
  return data;
}

test("prepara cada assunto para a caixa comercial e preserva acentos e separadores", () => {
  for (const [key, label] of CONTACT_TOPICS) {
    const draft = prepareContactEmail(createFields(key));
    const url = new URL(draft.href);
    assert.equal(url.protocol, "mailto:");
    assert.equal(url.pathname, COMMERCIAL_EMAIL);
    assert.equal(draft.category, key);
    assert.equal(url.searchParams.get("subject"), `Contato Provisio: ${label}`);
    assert.equal(url.searchParams.get("body"), "Nome: Beatriz\r\nContato: teste@example.invalid\r\n\r\nCotação: detergente & café?\r\nFim #1");
    assert.deepEqual([...url.searchParams.keys()], ["subject", "body"]);
  }
});

test("não prepara mensagens em branco ou com assunto não reconhecido", () => {
  assert.equal(prepareContactEmail(createFields("compras", " \n ")), null);
  assert.equal(prepareContactEmail(createFields("desconhecido")), null);
  const missing = createFields("compras");
  missing.delete("contact");
  assert.equal(prepareContactEmail(missing), null);
});
