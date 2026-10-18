import { retrieveWordDefinitionUsecase } from "$application/usecases/retrieve-word-definition.usecase.tsx";
import { DbContext } from "$infrastructure/kv/dbcontext.ts";
import {
  createWordDefinitionResponse,
  createWordNotFoundResponse,
} from "$interfaces/helpers/rae-response.helper.tsx";
import { Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

function page(content: ReactNode) {
  return renderToStaticMarkup(
    <>
      <style>
        {`
          body { font-family: Arial, sans-serif; padding: 20px; }
          a { color: blue; text-decoration: none; }
          a:hover { text-decoration: underline; }
        `}
      </style>
      <div style={{ whiteSpace: "pre-wrap" }}>{content}</div>
    </>,
  );
}

/**
 * Development-only preview of the RAE rendering, without going through
 * Telegram. Exposed at `GET /dict?word=casa` when `DEBUG` is enabled.
 */
export async function renderDictPreview(
  word: string | undefined,
): Promise<{ status: 200 | 400; html: string }> {
  if (!word) {
    return {
      status: 400,
      html: page(<div>Please provide a word query parameter</div>),
    };
  }

  const result = await DbContext.use((db) =>
    retrieveWordDefinitionUsecase({
      db,
      palabra: word,
      botUserName: "test_bot",
      acepcionIndex: 0,
    })
  );

  if (!result || result.sugerencias) {
    const { content } = createWordNotFoundResponse(word, result?.sugerencias);

    return {
      status: 200,
      html: page(
        <>
          {content}
          <ul>
            {result?.sugerencias?.map((sugerencia, index) => (
              <li key={index}>
                <a href={`?word=${sugerencia.word}`}>{sugerencia.label}</a>
              </li>
            ))}
          </ul>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </>,
      ),
    };
  }

  const { content } = createWordDefinitionResponse({
    word: result.word,
    etimologia: result.etimologia,
    definiciones: result.definiciones,
    url: result.url,
  });

  return {
    status: 200,
    html: page(
      <>
        {content}
        {result.more && (
          <div style={{ marginTop: "20px" }}>
            <dl>
              {result.more.map((item, index) => (
                <Fragment key={index}>
                  <dt>
                    <b>{item.title}</b>
                  </dt>
                  {item.acepciones.map((acepcion, aindex) => <dd key={aindex}>{acepcion}</dd>)}
                </Fragment>
              ))}
            </dl>
          </div>
        )}
      </>,
    ),
  };
}
